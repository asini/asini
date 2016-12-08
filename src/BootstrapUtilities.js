import FileSystemUtilities from "./FileSystemUtilities";
import PackageUtilities from "./PackageUtilities";
import NpmUtilities from "./NpmUtilities";
import find from "lodash.find";
import async from "async";
import path from "path";
import semver from "semver";

export default class BootstrapUtilities {
  static hoistedDirectory(rootPath, dependency) {
    return path.join(rootPath, "node_modules", dependency);
  }

  static hoistedPackageJson(rootPath, dependency) {
    try {
      return require((BootstrapUtilities.hoistedDirectory(rootPath, dependency), "package.json"));
    } catch (e) {
      // Pass.
    }
  }

  /**
   * Given an array of packages, return map of dependencies to install
   * @param {Array.<Package>} packages An array of packages
   * @returns {Object}
   */
  static getDependenciesToInstall(command, packages = []) {

    // find package by name
    const findPackage = (name, version) => find(command.packages, (pkg) => {
      return pkg.name === name && (!version || semver.satisfies(pkg.version, version));
    });

    const hasPackage = (name, version) => Boolean(findPackage(name, version));

    // Configuration for what packages to hoist may be in asini.json or it may
    // come in as command line options.
    const {hoist: scope, nohoist: ignore} = command.getOptions();

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

      let rootVersion;

      if (scope && PackageUtilities.getFilteredPackage({name}, {scope, ignore})) {

        // Get the most common version.
        const commonVersion = Object.keys(versions)
          .reduce((a, b) => versions[a] > versions[b] ? a : b);

        // Get the version required by the repo root (if any).
        // If the root doesn't have a dependency on this package then we'll
        // install the most common dependency there.
        rootVersion = command.repository.package.allDependencies[name] || commonVersion;

        if (rootVersion !== commonVersion) {
          command.logger.warn(
            `The repository root depends on ${name}@${rootVersion}, ` +
            `which differs from the more common ${name}@${commonVersion}.`
          );
        }

        // Install the best version we can in the repo root.
        // Even if it's already installed there we still need to make sure any
        // binaries are linked to the packages that depend on them.
        root.push({
          name,
          dependents: (dependents[rootVersion] || [])
            .map((dep) => command.packageGraph.get(dep).package),
          dependency: command.repository.hasDependencyInstalled(name, rootVersion)
            ? null // Don't re-install if it's already there.
            : `${name}@${rootVersion}`,
        });
      }

      // Add less common versions to package installs.
      Object.keys(versions).forEach((version) => {

        // Only install deps that can't be hoisted in the leaves.
        if (version === rootVersion) return;

        dependents[version].forEach((pkg) => {

          if (rootVersion) {
            command.logger.warn(
              `"${pkg}" package depends on ${name}@${version}, ` +
              `which differs from the hoisted ${name}@${rootVersion}.`
            );
          }

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
  static installExternalDependencies(command, packages, callback) {
    const {leaves, root} = BootstrapUtilities.getDependenciesToInstall(command, packages);

    const actions = [];

    // Start root install first, if any, since it's likely to take the longest.
    if (Object.keys(root).length) {
      actions.push((cb) => NpmUtilities.installInDir(
        command.repository.rootPath,
        root.map(({dependency}) => dependency).filter((dep) => dep),
        (err) => {
          if (err) return cb(err);

          // Link binaries into dependent packages so npm scripts will have
          // access to them.
          async.series(root.map(({name, dependents}) => (cb) => {
            const {bin} = (BootstrapUtilities.hoistedPackageJson(name) || {});
            if (bin) {
              async.series(dependents.map((pkg) => (cb) => {
                const src  = command.hoistedDirectory(name);
                const dest = pkg.nodeModulesLocation;
                BootstrapUtilities.createBinaryLink(src, dest, name, bin, cb);
              }), cb);
            } else {
              cb();
            }
          }), (err) => {
            command.progressBar.tick("Install hoisted");
            cb(err);
          });
        }
      ));

      // Remove any hoisted dependencies that may have previously been
      // installed in package directories.
      actions.push((cb) => {
        async.series(root.map(({name, dependents}) => (cb) => {
          async.series(dependents.map(({nodeModulesLocation: dir}) => (cb) => {
            if (dir === command.repository.nodeModulesLocation) return cb();
            FileSystemUtilities.rimraf(path.join(dir, name), cb);
          }), cb);
        }), (err) => {
          command.progressBar.tick("Prune hoisted");
          cb(err);
        });
      });
    }

    // Install anything that needs to go into the leaves.
    Object.keys(leaves)
      .map((pkgName) => ({pkg: command.packageGraph.get(pkgName).package, deps: leaves[pkgName]}))
      .forEach(({pkg, deps}) => actions.push(
        (cb) => NpmUtilities.installInDir(pkg.location, deps, (err) => {
          command.progressBar.tick(pkg.name);
          cb(err);
        })
      ));

    if (actions.length) {

      command.logger.info("Installing external dependencies");

      command.progressBar.init(actions.length);
    }

    async.parallelLimit(actions, command.concurrency, (err) => {
      command.progressBar.terminate();
      callback(err);
    });
  }

  /**
   * Create a symlink to a dependency's binary in the node_modules/.bin folder
   * @param {String} src
   * @param {String} dest
   * @param {String} name
   * @param {String|Object} bin
   * @param {Function} callback
   */
  static createBinaryLink(src, dest, name, bin, callback) {
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
}
