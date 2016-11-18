import GitUtilities from "./GitUtilities";
import FileSystemUtilities from "./FileSystemUtilities";
import PackageUtilities from "./PackageUtilities";
import Package from "./Package";
import NpmUtilities from "./NpmUtilities";
import path from "path";
import logger from "./logger";
import semver from "semver";

const DEFAULT_PACKAGE_GLOB = "packages/*/package.json";

export default class Repository {
  constructor() {
    if (!GitUtilities.isInitialized()) {
      logger.info("Initializing Git repository.");
      GitUtilities.init();
    }

    this.rootPath = path.resolve(GitUtilities.getTopLevelDirectory());
    this.asiniJsonLocation = path.join(this.rootPath, "asini.json");
    this.packageJsonLocation = path.join(this.rootPath, "package.json");
    this.packagesLocation = path.join(this.rootPath, "packages"); // TODO: Kill this.

    // Legacy
    this.versionLocation = path.join(this.rootPath, "VERSION");

    if (FileSystemUtilities.existsSync(this.asiniJsonLocation)) {
      this.asiniJson = JSON.parse(FileSystemUtilities.readFileSync(this.asiniJsonLocation));
    } else {
      // No need to distinguish between missing and empty.
      // This saves us a lot of guards.
      this.asiniJson = {};
    }

    if (FileSystemUtilities.existsSync(this.packageJsonLocation)) {
      this.packageJson = JSON.parse(FileSystemUtilities.readFileSync(this.packageJsonLocation));
    }

    this.package = new Package(this.packageJson, this.rootPath);
  }

  get asiniVersion() {
    return this.asiniJson.asini;
  }

  get version() {
    return this.asiniJson.version;
  }

  get nodeModulesLocation() {
    return path.join(this.rootPath, "node_modules");
  }

  get packageConfigs() {
    return this.asiniJson.packages || [{
      glob: DEFAULT_PACKAGE_GLOB,
    }];
  }

  get packages() {
    if (!this._packages) {
      this.buildPackageGraph();
    }
    return this._packages;
  }

  get filteredPackages() {
    if (!this._filteredPackages) {
      this.buildPackageGraph();
    }
    return this._filteredPackages;
  }

  get packageGraph() {
    if (!this._packageGraph) {
      this.buildPackageGraph();
    }
    return this._packageGraph;
  }

  isIndependent() {
    return this.version === "independent";
  }

  buildPackageGraph({scope, ignore} = {}) {
    this._packages = PackageUtilities.getPackages(this);
    this._packageGraph = PackageUtilities.getPackageGraph(this._packages);
    this._filteredPackages = PackageUtilities.getFilteredPackages(this._packages, {scope, ignore});
  }

  hasCompatibleLocalAsini(needVersion) {
    return semver.satisfies(
      this.asiniVersion, `^${semver.major(needVersion)}`
    );
  }

  hasDependencyInstalled(dependency, version) {
    return NpmUtilities.dependencyIsSatisfied(
      this.nodeModulesLocation, dependency, version
    );
  }
}
