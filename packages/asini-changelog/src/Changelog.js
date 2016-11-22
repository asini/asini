import AsiniRepo          from "asini/lib/Repository";
import progressBar        from "asini/lib/progressBar";
import RemoteRepo         from "./RemoteRepo";
import execSync           from "./execSync";
import ConfigurationError from "./ConfigurationError";

export default class Changelog {
  constructor() {
    this.config = this.getConfig();
    this.remote = new RemoteRepo(this.config);
  }

  getConfig() {
    const asini = new AsiniRepo();

    const config = asini.asiniJson.changelog;

    if (!config) {
      throw new ConfigurationError(
        "Missing changelog config in `asini.json`.\n" +
        "See docs for setup: https://github.com/asini/asini/tree/master/packages/asini-changelog#asini-changelog"
      );
    }

    config.rootPath = asini.rootPath;

    return config;
  }

  createMarkdown() {
    const commitInfo = this.getCommitInfo();
    const committers = this.getCommitters(commitInfo);
    const commitsByCategory = this.getCommitsByCategory(commitInfo);
    const fixesRegex = /Fix(es)? [T#](\d+)/i;

    let date = new Date().toISOString();

    date = date.slice(0, date.indexOf("T"));

    let markdown = "\n";

    markdown += "## Unreleased (" + date + ")";

    progressBar.init(commitsByCategory.length);

    commitsByCategory.filter((category) => {
      return category.commits.length > 0;
    }).forEach((category) => {
      progressBar.tick(category.heading);

      const commitsByPackage = {};

      category.commits.forEach((commit) => {

        // Array of unique packages.
        const changedPackages = Object.keys(
          execSync("git show -m --name-only --pretty='format:' --first-parent " + commit.commitSHA)
          // turn into an array
          .split("\n")
          // extract base package name, and stuff into an object for deduping.
          .reduce(function(obj, files) {
            if (files.indexOf("packages/") === 0) {
              obj[files.slice(9).split("/", 1)[0]] = true;
            }
            return obj;
          }, {})
        );

        const heading = changedPackages.length > 0
          ? "* " + changedPackages.map((pkg) => "`" + pkg + "`").join(", ")
          : "* Other"; // No changes to packages, but still relevant.

        if (!commitsByPackage[heading]) {
          commitsByPackage[heading] = [];
        }

        commitsByPackage[heading].push(commit);
      });

      markdown += "\n";
      markdown += "\n";
      markdown += "#### " + category.heading;

      Object.keys(commitsByPackage).forEach((heading) => {
        markdown += "\n" + heading;

        commitsByPackage[heading].forEach((commit) => {

          markdown += "\n  * ";

          if (commit.number) {
            const prUrl = this.remote.getBasePullRequestUrl() + commit.number;
            markdown += "[#" + commit.number + "](" + prUrl + ") ";
          }

          if (commit.title.match(fixesRegex)) {
            commit.title = commit.title.replace(fixesRegex, "Fixes [#$2](" + this.remote.getBaseIssueUrl() + "$2)");
          }

          markdown += commit.title + "." + " ([@" + commit.user.login + "](" + commit.user.html_url + "))";
        });
      });
    });

    progressBar.terminate();

    markdown += "\n\n#### Commiters: " + committers.length + "\n";
    markdown += committers.map(function(commiter) {
      return "- " + commiter;
    }).join("\n");

    return markdown;
  }

  getLastTag() {
    return execSync("git describe --abbrev=0 --tags");
  }

  getListOfCommits() {
    return execSync("git log --oneline " + this.getLastTag() + "..").split("\n");
  }

  getCommitters(commits) {
    const committers = {};

    commits.forEach((commit) => {
      const login = (commit.user || {}).login;
      if (login && !committers[login]) {
        const user = this.remote.getUserData(login);
        committers[login] = `${user.name} ([${login}](${user.html_url}))`;
      }
    });

    return Object.keys(committers).map((k) => committers[k]).sort();
  }

  getCommitInfo() {
    const commits = this.getListOfCommits();

    progressBar.init(commits.length);

    const logs = commits.map((commit) => {

      const sha = commit.slice(0, 7);
      const message = commit.slice(8);
      let response, issueNumber;
      progressBar.tick(sha);

      const mergeCommit = message.match(/\(#(\d+)\)$/);

      if (message.indexOf("Merge pull request ") === 0) {
        const start = message.indexOf("#") + 1;
        const end = message.slice(start).indexOf(" ");

        issueNumber = message.slice(start, start + end);

        response = this.remote.getIssueData(issueNumber);
        response.commitSHA = sha;
        response.mergeMessage = message;
        return response;
      } else if (mergeCommit) {
        issueNumber = mergeCommit[1];
        response = this.remote.getIssueData(issueNumber);
        response.commitSHA = sha;
        response.mergeMessage = message;
        return response;
      }

      return {
        commitSHA: sha,
        message: message,
        labels: []
      };
    });

    progressBar.terminate();
    return logs;
  }

  getCommitsByCategory(logs) {
    return this.remote.getLabels().map((label) => {
      const commits = [];

      logs.forEach(function(log) {
        const labels = log.labels.map(function(label) {
          return label.name;
        });

        if (labels.indexOf(label.toLowerCase()) >= 0) {
          commits.push(log);
        }
      });

      return {
        heading: this.remote.getHeadingForLabel(label),
        commits: commits
      };
    });
  }
}
