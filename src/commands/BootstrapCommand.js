import FileSystemUtilities from "../FileSystemUtilities";
import NpmUtilities from "../NpmUtilities";
import PackageUtilities from "../PackageUtilities";
import Command from "../Command";
import async from "async";
import find from "lodash.find";
import path from "path";
import semver from "semver";

export default class BootstrapCommand extends Command {
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
      (cb) => this.installExternalDependencies(cb),
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
   * Create a symlink to a dependency's binary in the node_modules/.bin folder
   * @param {String} src
   * @param {String} dest
   * @param {String} name
   * @param {String|Object} bin
   * @param {Function} callback
   */
  createBinaryLink(src, dest, name, bin, callback) {
    const destBinFolder = path.join(dest, ".bin");
    // The `bin` in a package.json may be either a string or an object.
    // Normalize to an object.
    const bins = typeof bin === "string"
      ? { [name]: bin }
      : bin;
    const srcBinFiles = [];
    const destBinFiles = [];
    Object.keys(bins).forEach((name) => {
      srcBinFiles.push(path.join(src, bins[name]));
      destBinFiles.push(path.join(destBinFolder, name));
    });
    // make sure when have a destination folder (node_modules/.bin)
    const actions = [(cb) => FileSystemUtilities.mkdirp(destBinFolder, cb)];
    // symlink each binary
    srcBinFiles.forEach((binFile, idx) => {
      actions.push((cb) => FileSystemUtilities.symlink(binFile, destBinFiles[idx], "exec", cb));
    });
    async.series(actions, callback);
  }

  /**
   * Determine if a dependency installed at the root satifies the requirements of the passed packages
   * This helps to optimize the bootstrap process and skip dependencies that are already installed
   * @param {String} dependency
   * @param {Array.<String>} packages
   */
  dependencySatisfiesPackages(dependency, packages) {
    const packageJson = path.join(this.repository.rootPath, "node_modules", dependency, "package.json");
    try {
      return packages.every((pkg) => {
        return semver.satisfies(
          require(packageJson).version,
          pkg.allDependencies[dependency]
        );
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * Given an array of packages, return map of dependencies to install
   * @param {Array.<Package>} packages An array of packages
   * @returns {Object}
   */
  getDependenciesToInstall(packages = []) {

    // find package by name
    const findPackage = (name, version) => find(this.packages, (pkg) => {
      return pkg.name === name && (!version || semver.satisfies(pkg.version, version));
    });

    const hasPackage = (name, version) => Boolean(findPackage(name, version));

    // This will contain entries for each hoistable dependency.
    const root = [];

    // This will map packages to lists of unhoistable dependencies
    const leaves = {};

    /**
     * Map of dependencies to install
     * {
     *   <name>: {
     *     versions: {
     *       <version>: <# of dependents>
     *     },
     *     dependents: {
     *       <version>: [<dependent1>, <dependent2>, ...]
     *     }
     *   }
     * }
     *
     * Example:
     *
     * {
     *   react: {
     *     versions: {
     *       "15.x": 3,
     *       "^0.14.0": 1
     *     },
     *     dependents: {
     *       "15.x": ["my-component1", "my-component2", "my-component3"],
     *       "^0.14.0": ["my-component4"],
     *     }
     *   }
     * }
     */
    const depsToInstall = {};

    // get the map of external dependencies to install
    packages.forEach((pkg) => {

      // for all package dependencies
      Object.keys(pkg.allDependencies)

        // map to package or normalized external dependency
        .map((name) => findPackage(name, pkg.allDependencies[name]) || { name, version: pkg.allDependencies[name] })

        // match external and version mismatched local packages
        .filter((dep) => !hasPackage(dep.name, dep.version) || !pkg.hasMatchingDependency(dep))

        .forEach(({name, version}) => {

          // Get the object for this package, auto-vivifying.
          const dep = depsToInstall[name] || (depsToInstall[name] = {
            versions   : {},
            dependents : {}
          });

          // Add this version if it's the first time we've seen it.
          if (!dep.versions[version]) {
            dep.versions  [version] = 0;
            dep.dependents[version] = [];
          }

          // Record the dependency on this version.
          dep.versions  [version]++;
          dep.dependents[version].push(pkg.name);
        });
    });

    // determine where each dependency will be installed
    Object.keys(depsToInstall).forEach((name) => {
      const {versions, dependents} = depsToInstall[name];

      // Get the most common version.
      const commonVersion = Object.keys(versions)
        .reduce((a, b) => versions[a] > versions[b] ? a : b);

      // Only need to install if not already satisfied.
      if (!this.repository.hasDependencyInstalled(name, commonVersion)) {

        // Install the most common version in the repo root.
        root.push({
          dependency: `${name}@${commonVersion}`,
          dependents: dependents[commonVersion],
        });
      }

      // Add less common versions to package installs.
      Object.keys(versions).forEach((version) => {

        // Only install less common deps in the leaves.
        if (version === commonVersion) return;

        dependents[version].forEach((pkg) => {

          this.logger.warn(
            `"${pkg}" package depends on ${name}@${version}, ` +
            `which differs from the more common ${name}@${commonVersion}.`
          );

          // only install dependency if it's not already installed
          if (!findPackage(pkg).hasDependencyInstalled(name)) {
            (leaves[pkg] || (leaves[pkg] = [])).push(`${name}@${version}`);
          }
        });
      });
    });
    return { root, leaves };
  }

  /**
   * Install external dependencies for all packages
   * @param {Function} callback
   */
  installExternalDependencies(callback) {
    const {leaves, root} = this.getDependenciesToInstall(this.filteredPackages);

    const actions = Object.keys(leaves)
      .map((pkgName) => ({pkg: this.packageGraph.get(pkgName).package, deps: leaves[pkgName]}))
      .map(({pkg, deps}) => (cb) => NpmUtilities.installInDir(pkg.location, deps, (err) => {
        this.progressBar.tick(pkg.name);
        cb(err);
      }));

    if (Object.keys(root).length) {
      actions.push((cb) => NpmUtilities.installInDir(
        this.repository.rootPath,
        root.map(({dependency}) => dependency),
        (err) => {
          // TODO: Link binaries.
          this.progressBar.tick("Hoisted");
          cb(err);
        }
      ));
    }

    if (actions.length) {

      this.logger.info("Installing external dependencies");

      // One extra for the root.
      this.progressBar.init(actions.length);
    }

    async.parallelLimit(actions, this.concurrency, (err) => {
      this.progressBar.terminate();
      callback(err);
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
