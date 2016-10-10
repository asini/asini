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
    this.ensurePackageJSON();
    this.ensureAsiniJson();
    this.ensureNoVersionFile();
    this.logger.success("Successfully created Asini files");
    callback(null, true);
  }

  ensurePackageJSON() {
    let {packageJsonLocation, packageJson} = this.repository;

    if (!packageJson) {
      packageJson = {};
      this.logger.info("Creating package.json.");
    } else {
      this.logger.info("Updating package.json.");
    }

    let targetDependencies;
    if (packageJson.dependencies && packageJson.dependencies.lerna) {
      // lerna is a dependency in the current project
      targetDependencies = packageJson.dependencies;
    } else {
      // lerna is a devDependency or no dependency, yet
      if (!packageJson.devDependencies) packageJson.devDependencies = {};
      targetDependencies = packageJson.devDependencies;
    }

    objectAssignSorted(targetDependencies, {
      lerna: this.lernaVersion
    });

    // if (!packageJson.private) packageJson.private = true;
    if (!packageJson.devDependencies) packageJson.devDependencies = {};

    objectAssignSorted(packageJson.devDependencies, {
      asini: this.asiniVersion
    });

    FileSystemUtilities.writeFileSync(packageJsonLocation, JSON.stringify(packageJson, null, "  "));
  }

  ensureAsiniJson() {
    let {
      versionLocation,
      asiniJsonLocation,
      asiniJson,
      packageConfigs,
    } = this.repository;

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
      packages: packageConfigs,
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
