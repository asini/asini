import async from "async";
import Command from "../Command";
import NpmUtilities from "../NpmUtilities";
import BootstrapUtilities from "../BootstrapUtilities";

export default class AddCommand extends Command {

  initialize(callback) {
    if (!this.input.length) {
      return callback(new Error("Missing argument: Dependency to be added"));
    }

    this.depType = "dependencies";

    if (this.flags.dev     ) this.depType = "devDependencies";
    if (this.flags.peer    ) this.depType = "peerDependencies";
    if (this.flags.optional) this.depType = "optionalDependencies";

    callback(null, true);
  }

  add(dep, version, callback) {
    async.series(this.filteredPackages.map((pkg) => (cb) => {
      pkg.addDependency(this.depType, dep, version, (err) => {
        this.progressBar.tick(dep);
        cb(err);
      });
    }), callback);
  }

  execute(callback) {
    this.progressBar.init(this.input.length);
    async.parallelLimit(this.input.map((dep) => (cb) => {
      const [pkg, version] = NpmUtilities.splitVersion(dep);
      if (version) {
        this.add(pkg, version, cb);
      } else {
        NpmUtilities.getLatestVersion(pkg, (err, version) => {
          if (err) return cb(err);
          this.add(pkg, "^" + version, cb);
        });
      }
    }), this.concurrency, (err) => {
      this.progressBar.terminate();
      if (err) return callback(err);
      BootstrapUtilities.installExternalDependencies(this, this.packages, (err) => {
        if (err) return callback(err);
        callback(null, true);
      });
    });
  }
}
