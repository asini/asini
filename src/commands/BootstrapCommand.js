import FileSystemUtilities from "../FileSystemUtilities";
import PackageUtilities from "../PackageUtilities";
import BootstrapMixin from "../mixins/BootstrapMixin";
import Command from "../Command";
import async from "async";
import path from "path";
import semver from "semver";

export default class BootstrapCommand extends BootstrapMixin(Command) {
  initialize(callback) {
    // Nothing to do...
    callback(null, true);
  }

  execute(callback) {
    this.bootstrapPackages((err) => {
      if (err) {
        callback(err);
      } else {
        this.logger.success(`Successfully bootstrapped ${this.filteredPackages.length} packages.`);
        callback(null, true);
      }
    });
  }

  /**
   * Bootstrap packages
   * @param {Function} callback
   */
  bootstrapPackages(callback) {
    this.filteredGraph = PackageUtilities.getPackageGraph(this.filteredPackages);
    this.logger.info(`Bootstrapping ${this.filteredPackages.length} packages`);
    async.series([
      // preinstall bootstrapped packages
      (cb) => this.preinstallPackages(cb),
      // install external dependencies
      (cb) => this.installExternalDependencies(this.filteredPackages, cb),
      // symlink packages and their binaries
      (cb) => this.symlinkPackages(cb),
      // postinstall bootstrapped packages
      (cb) => this.postinstallPackages(cb),
      // prepublish bootstrapped packages
      (cb) => this.prepublishPackages(cb)
    ], callback);
  }

  runScriptInPackages(scriptName, callback) {
    const packages = this.filteredPackages.slice();

    // If we don't have any packages, then we have nothing to do.
    if (!packages.length) {
      return callback();
    }

    const batches = PackageUtilities.topologicallyBatchPackages(packages, this.logger);

    this.progressBar.init(packages.length);

    const bootstrapBatch = () => {
      const batch = batches.shift();

      async.parallelLimit(batch.map((pkg) => (done) => {
        pkg.runScript(scriptName, (err) => {
          this.progressBar.tick(pkg.name);
          done(err);
        });
      }), this.concurrency, (err) => {
        if (batches.length && !err) {
          bootstrapBatch();
        } else {
          this.progressBar.terminate();
          callback(err);
        }
      });
    };

    // Kick off the first batch.
    bootstrapBatch();
  }

  /**
   * Run the "preinstall" NPM script in all bootstrapped packages
   * @param callback
   */
  preinstallPackages(callback) {
    this.logger.info("Preinstalling packages");
    this.runScriptInPackages("preinstall", callback);
  }

  /**
   * Run the "postinstall" NPM script in all bootstrapped packages
   * @param callback
   */
  postinstallPackages(callback) {
    this.logger.info("Postinstalling packages");
    this.runScriptInPackages("postinstall", callback);
  }

  /**
   * Run the "prepublish" NPM script in all bootstrapped packages
   * @param callback
   */
  prepublishPackages(callback) {
    this.logger.info("Prepublishing packages");
    this.runScriptInPackages("prepublish", callback);
  }

  /**
   * Determine if a dependency installed at the root satifies the requirements of the passed packages
   * This helps to optimize the bootstrap process and skip dependencies that are already installed
   * @param {String} dependency
   * @param {Array.<String>} packages
   */
  dependencySatisfiesPackages(dependency, packages) {
    const {version} = (this.hoistedPackageJson(dependency) || {});
    return packages.every((pkg) => {
      return semver.satisfies(
        version,
        pkg.allDependencies[dependency]
      );
    });
  }

  /**
   * Symlink all packages to the packages/node_modules directory
   * Symlink package binaries to dependent packages' node_modules/.bin directory
   * @param {Function} callback
   */
  symlinkPackages(callback) {
    this.logger.info("Symlinking packages and binaries");
    this.progressBar.init(this.filteredPackages.length);
    const actions = [];
    this.filteredPackages.forEach((filteredPackage) => {
      // actions to run for this package
      const packageActions = [];
      Object.keys(filteredPackage.allDependencies)
        // filter out external dependencies and incompatible packages
        .filter((dependency) => {
          const match = this.packageGraph.get(dependency);
          return match && filteredPackage.hasMatchingDependency(match.package);
        })
        .forEach((dependency) => {
          // get Package of dependency
          const dependencyPackage = this.packageGraph.get(dependency).package;
          // get path to dependency and its scope
          const { location: dependencyLocation } = dependencyPackage;
          const dependencyPackageJsonLocation = path.join(dependencyLocation, "package.json");
          // ignore dependencies without a package.json file
          if (!FileSystemUtilities.existsSync(dependencyPackageJsonLocation)) {
            this.logger.error(
              `Unable to find package.json for ${dependency} dependency of ${filteredPackage.name},  ` +
              "Skipping..."
            );
          } else {
            // get the destination directory name of the dependency
            const pkgDependencyLocation = path.join(filteredPackage.nodeModulesLocation, dependencyPackage.name);
            // check if dependency is already installed
            if (FileSystemUtilities.existsSync(pkgDependencyLocation)) {
              const isDepSymlink = FileSystemUtilities.isSymlink(pkgDependencyLocation);
              // installed dependency is a symlink pointing to a different location
              if (isDepSymlink !== false && isDepSymlink !== dependencyLocation) {
                this.logger.warn(
                  `Symlink already exists for ${dependency} dependency of ${filteredPackage.name}, ` +
                  "but links to different location. Replacing with updated symlink..."
                );
              // installed dependency is not a symlink
              } else if (isDepSymlink === false) {
                this.logger.warn(
                  `${dependency} is already installed for ${filteredPackage.name}. ` +
                  "Replacing with symlink..."
                );
                // remove installed dependency
                packageActions.push((cb) => FileSystemUtilities.rimraf(pkgDependencyLocation, cb));
              }
            }
            // ensure destination path
            packageActions.push((cb) => FileSystemUtilities.mkdirp(
              pkgDependencyLocation.split(path.sep).slice(0, -1).join(path.sep), cb
            ));
            // create package symlink
            packageActions.push((cb) => FileSystemUtilities.symlink(
              dependencyLocation, pkgDependencyLocation, "junction", cb
            ));
            const dependencyPackageJson = require(dependencyPackageJsonLocation);
            if (dependencyPackageJson.bin) {
              const destFolder = filteredPackage.nodeModulesLocation;
              packageActions.push((cb) => {
                this.createBinaryLink(dependencyLocation, destFolder, dependency, dependencyPackageJson.bin, cb);
              });
            }
          }
        });
      actions.push((cb) => {
        async.series(packageActions, (err) => {
          this.progressBar.tick(filteredPackage.name);
          cb(err);
        });
      });
    });
    async.series(actions, (err) => {
      this.progressBar.terminate();
      callback(err);
    });
  }
}
