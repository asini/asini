import objectAssign from "object-assign";
import path from "path";
import semver from "semver";
import NpmUtilities from "./NpmUtilities";
import FileSystemUtilities from "./FileSystemUtilities";

export default class Package {
  constructor(pkg, location) {
    this._package = pkg;
    this._location = location;
  }

  get name() {
    return this._package.name;
  }

  get location() {
    return this._location;
  }

  get nodeModulesLocation() {
    return path.join(this._location, "node_modules");
  }

  get packageJsonLocation() {
    return path.join(this._location, "package.json");
  }

  get version() {
    return this._package.version;
  }

  set version(version) {
    this._package.version = version;
  }

  get bin() {
    return this._package.bin;
  }

  get dependencies() {
    return this._package.dependencies;
  }

  get devDependencies() {
    return this._package.devDependencies;
  }

  get peerDependencies() {
    return this._package.peerDependencies;
  }

  get optionalDependencies() {
    return this._package.optionalDependencies;
  }

  get allDependencies() {
    return objectAssign(
      {},
      this.devDependencies,
      this.dependencies
    );
  }

  get scripts() {
    return this._package.scripts || {};
  }

  isPrivate() {
    return !!this._package.private;
  }

  toJsonString() {
    return JSON.stringify(this._package, null, 2) + "\n";
  }

  addDependency(type, dep, version, callback) {
    (this._package[type] || (this._package[type] = {}))[dep] = version;

    this.writePackageJson(callback);
  }

  writePackageJson(callback) {
    FileSystemUtilities.writeFile(this.packageJsonLocation, this.toJsonString(), callback);
  }

  /**
   * Run a NPM script in this package's directory
   * @param {String} script NPM script to run
   * @param {Function} callback
   */
  runScript(script, callback) {
    if (this.scripts[script]) {
      NpmUtilities.runScriptInDir(script, [], this.location, callback);
    } else {
      callback();
    }
  }

  /**
   * Determine if a dependency version satisfies the requirements of this package
   * @param {Package} dependency
   * @returns {Boolean}
   */
  hasMatchingDependency(dependency) {
    const expectedVersion = this.allDependencies[dependency.name];
    const actualVersion = dependency.version;

    if (!expectedVersion) {
      return false;
    }

    // check if semantic versions are compatible
    if (semver.satisfies(actualVersion, expectedVersion)) {
      return true;
    }

    return false;
  }

  /**
   * Determine if a dependency has already been installed for this package
   * @param {String} dependency Name of the dependency
   * @returns {Boolean}
   */
  hasDependencyInstalled(dependency) {
    return NpmUtilities.dependencyIsSatisfied(
      this.nodeModulesLocation, dependency, this.allDependencies[dependency]
    );
  }
}
