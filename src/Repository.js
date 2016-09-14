import GitUtilities from "./GitUtilities";
import FileSystemUtilities from "./FileSystemUtilities";
import path from "path";
import logger from "./logger";

export default class Repository {
  constructor() {
    if (!GitUtilities.isInitialized()) {
      logger.info("Initializing Git repository.");
      GitUtilities.init();
    }

    this.rootPath = path.resolve(GitUtilities.getTopLevelDirectory());
    this.asiniJsonLocation = path.join(this.rootPath, "asini.json");
    this.packageJsonLocation = path.join(this.rootPath, "package.json");
    this.packagesLocation = path.join(this.rootPath, "packages");

    // Legacy
    this.versionLocation = path.join(this.rootPath, "VERSION");

    if (FileSystemUtilities.existsSync(this.asiniJsonLocation)) {
      this.asiniJson = JSON.parse(FileSystemUtilities.readFileSync(this.asiniJsonLocation));
    }

    if (FileSystemUtilities.existsSync(this.packageJsonLocation)) {
      this.packageJson = JSON.parse(FileSystemUtilities.readFileSync(this.packageJsonLocation));
    }
  }

  get asiniVersion() {
    return this.asiniJson && this.asiniJson.asini;
  }

  get version() {
    return this.asiniJson && this.asiniJson.version;
  }

  get publishConfig() {
    return this.asiniJson && this.asiniJson.publishConfig || {};
  }

  get bootstrapConfig() {
    return this.asiniJson && this.asiniJson.bootstrapConfig || {};
  }

  isIndependent() {
    return this.version === "independent";
  }
}
