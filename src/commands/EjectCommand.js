import Command from "../Command";
import FileSystemUtilities from "../FileSystemUtilities";
import async from "async";
import path from "path";
import userHome from "user-home";

export default class EjectCommand extends Command {
  initialize(callback) {
    this.to = this.flags.to || userHome;
    this.dry = this.flags.dry;

    this.pkg = this.input[0];

    if (this.dry) {
      this.logger.info("The following directories would be moved");
    }

    callback(null, true);
  }

  execute(callback) {
    if (this.pkg) {
      const pkg = this.filteredPackages.filter((pkg) => pkg._package.name === this.pkg)[0];

      if (!pkg) {
        callback(`no such package to eject ${this.pkg}`);
      }

      this.runCommandInPackage(pkg, callback);
    } else {
      async.parallelLimit(this.filteredPackages.map((pkg) => (cb) => {
        this.runCommandInPackage(pkg, cb);
      }), this.concurrency, callback);
    }
  }

  runCommandInPackage(pkg, callback) {
    const to = path.join(this.to, path.basename(pkg._location));

    if (this.dry) {
      this.logger.info(`  - ${pkg._location} -> ${to}`);
      callback(null, true);
    } else {
      // if we think this is a good idea, migrate it with the git history:
      // http://stackoverflow.com/questions/359424/detach-move-subdirectory-into-separate-git-repository/17864475#17864475
      FileSystemUtilities.renameSync(pkg._location, to, callback);
    }
  }
}
