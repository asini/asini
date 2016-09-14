import FileSystemUtilities from "../FileSystemUtilities";
import Command from "../Command";
import objectAssignSorted from "object-assign-sorted";
import objectAssign from "object-assign";

export default class InitCommand extends Command {
  // don't do any of this.
  runValidations() {}
  runPreparations() {}

  initialize(callback) {
    // Nothing to do...
    callback(null, true);
  }

  execute(callback) {
    this.ensurePackagesDirectory();
    this.ensurePackageJSON();
    this.ensureAsiniJson();
    this.ensureNoVersionFile();
    this.logger.success("Successfully created Asini files");
    callback(null, true);
  }

  ensurePackagesDirectory() {
    const packagesLocation = this.repository.packagesLocation;
    if (!FileSystemUtilities.existsSync(packagesLocation)) {
      this.logger.info("Creating packages folder.");
      FileSystemUtilities.mkdirSync(packagesLocation);
    }
  }

  ensurePackageJSON() {
    let {packageJsonLocation, packageJson} = this.repository;

    if (!packageJson) packageJson = {};
    // if (!packageJson.private) packageJson.private = true;
    if (!packageJson.devDependencies) packageJson.devDependencies = {};

    objectAssignSorted(packageJson.devDependencies, {
      asini: this.asiniVersion
    });

    if (!packageJson) {
      this.logger.info("Creating package.json.");
    } else {
      this.logger.info("Updating package.json.");
    }

    FileSystemUtilities.writeFileSync(packageJsonLocation, JSON.stringify(packageJson, null, "  "));
  }

  ensureAsiniJson() {
    let {versionLocation, asiniJsonLocation, asiniJson} = this.repository;

    let version;

    if (this.flags.independent) {
      version = "independent";
    } else if (FileSystemUtilities.existsSync(versionLocation)) {
      version = FileSystemUtilities.readFileSync(versionLocation);
    } else if (asiniJson && asiniJson.version) {
      version = asiniJson.version;
    } else {
      version = "0.0.0";
    }

    if (!asiniJson) {
      this.logger.info("Creating asini.json.");
      asiniJson = {};
    } else {
      this.logger.info("Updating asini.json.");
    }

    objectAssign(asiniJson, {
      asini: this.asiniVersion,
      version: version
    });

    FileSystemUtilities.writeFileSync(asiniJsonLocation, JSON.stringify(asiniJson, null, "  "));
  }

  ensureNoVersionFile() {
    const versionLocation = this.repository.versionLocation;
    if (FileSystemUtilities.existsSync(versionLocation)) {
      this.logger.info("Removing old VERSION file.");
      FileSystemUtilities.unlinkSync(versionLocation);
    }
  }
}
