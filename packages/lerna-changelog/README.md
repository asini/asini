# Asini Changelog

Generate a changelog for a [asini][asini-homepage] monorepo.

Based on [@hzoo][hzoo-profile]'s long-lived [PR][original-pr] for `lerna changelog`.

Uses github PR/Issue names categorized by labels with configurable headings.

## Usage

Install:

```bash
$ npm install -g asini-changelog
```

Configure:

```diff
$ git diff asini.json
...
 {
+  "changelog": {
+    "repo": "my-org/my-repo",
+    "labels": {
+      "bug": "Bug fix",
+      "cleanup": "Housekeeping"
+    },
+    "cacheDir": ".changelog"
+  },
   "asini": "x.x.x",
   "version": "0.2.11"
 }
```

Authenticate:

```
$ export GITHUB_AUTH="..."
```

Run:

```bash
$ asini-changelog

## Unreleased (2016-05-24)

#### Bug fix
* `my-package-a`, `my-package-b`
  * [#198](https://github.com/my-org/my-repo/pull/198) Avoid an infinite loop. ([@helpful-hacker](https://github.com/helpful-hacker))

#### Housekeeping
* `my-package-c`
  * [#183](https://github.com/my-org/my-repo/pull/183) Standardize error messages. ([@careful-coder](https://github.com/careful-coder))

#### Commiters: 2
- helpful-hacker
- careful-coder

```

Copypasta.  You're done!

## GitHub Auth

You'll need a GitHub API [personal access token](https://github.com/settings/tokens).

## Configuration

- `repo`: Your "org/repo" on GitHub
- `cacheDir` [optional]: A place to stash GitHub API responses to avoid throttling
- `labels`: GitHub issue/PR labels mapped to changelog section headers

[asini-homepage]: https://github.com/asini/asini
[hzoo-profile]: https://github.com/hzoo
[original-pr]: https://github.com/lerna/lerna/pull/29
