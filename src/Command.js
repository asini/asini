import objectAssign from "object-assign";
import ChildProcessUtilities from "./ChildProcessUtilities";
import FileSystemUtilities from "./FileSystemUtilities";
import ExitHandler from "./ExitHandler";
import progressBar from "./progressBar";
import Repository from "./Repository";
import logger from "./logger";

const DEFAULT_CONCURRENCY = 4;

export default class Command {
  constructor(input, flags) {
    this.input = input;
    this.flags = flags;

    this.asiniVersion = require("../package.json").version;
    this.logger = logger;
    this.repository = new Repository();
    this.progressBar = progressBar;
    this.concurrency = (!flags || flags.concurrency === undefined) ? DEFAULT_CONCURRENCY : Math.max(1, +flags.concurrency || DEFAULT_CONCURRENCY);
  }

  get name() {
    // For a class named "FooCommand" this returns "foo".
    return this.className.replace("Command", "").toLowerCase();
  }

  get className() {
    return this.constructor.name;
  }

  // Override this to inherit config from another command.
  // For example `updated` inherits config from `publish`.
  get otherCommandConfigs() {
    return [];
  }

  getOptions(...objects) {

    // Items lower down override items higher up.
    return objectAssign(
      {},

      // Deprecated legacy options in `asini.json`.
      this._legacyOptions(),

      // Global options from `asini.json`.
      this.repository.asiniJson,

      // Option overrides for commands.
      // Inherited options from `otherCommandConfigs` come before the current
      // command's configuration.
      ...[...this.otherCommandConfigs, this.name]
        .map((name) => (this.repository.asiniJson.command || {})[name]),

      // For example, the item from the `packages` array in config.
      ...objects,

      // CLI flags always override everything.
      this.flags,
    );
  }

  run() {
    this.logger.info("Asini v" + this.asiniVersion);

    if (this.repository.isIndependent()) {
      this.logger.info("Independent Versioning Mode");
    }

    this.runValidations();
    this.runPreparations();
    this.runCommand();
  }

  runValidations() {
    if (this.concurrency < 1) {
      this.logger.warn("command must be run with at least one thread.");
      this._complete(null, 1);
      return;
    }

    if (!FileSystemUtilities.existsSync(this.repository.packageJsonLocation)) {
      this.logger.warn("`package.json` does not exist, have you run `asini init`?");
      this._complete(null, 1);
      return;
    }

    if (!FileSystemUtilities.existsSync(this.repository.asiniJsonLocation)) {
      this.logger.warn("`asini.json` does not exist, have you run `asini init`?");
      this._complete(null, 1);
      return;
    }

    if (this.flags.independent && !this.repository.isIndependent()) {
      this.logger.warn(
        "You ran asini with `--independent` or `-i`, but the repository is not set to independent mode. " +
        "To use independent mode you need to set your `asini.json` \"version\" to \"independent\". " +
        "Then you won't need to pass the `--independent` or `-i` flags."
      );
      this._complete(null, 1);
      return;
    }

    if (
      process.env.NODE_ENV !== "test" &&
      this.asiniVersion !== this.repository.asiniVersion
    ) {
      this.logger.warn(
        `Asini version mismatch: The current version of asini is ${this.asiniVersion}, ` +
        `but the Asini version in \`asini.json\` is ${this.repository.asiniVersion}. ` +
        `You can either run \`asini init\` again or install \`asini@${this.repository.asiniVersion}\`.`
      );
      this._complete(null, 1);
      return;
    }

    if (FileSystemUtilities.existsSync(this.repository.versionLocation)) {
      this.logger.warn("You have a `VERSION` file in your repository, this is leftover from a previous ");
      this._complete(null, 1);
      return;
    }

    if (process.env.NPM_DIST_TAG !== undefined) {
      this.logger.warn("`NPM_DIST_TAG=[tagname] asini publish` is deprecated, please use `asini publish --tag [tagname]` instead.");
      this._complete(null, 1);
      return;
    }

    if (process.env.FORCE_VERSION !== undefined) {
      this.logger.warn("`FORCE_VERSION=[package/*] asini updated/publish` is deprecated, please use `asini updated/publish --force-publish [package/*]` instead.");
      this._complete(null, 1);
      return;
    }
  }

  runPreparations() {
    try {
      this.repository.buildPackageGraph(this.getOptions());
      this.packages = this.repository.packages;
      this.packageGraph = this.repository.packageGraph;
      this.filteredPackages = this.repository.filteredPackages;
    } catch (err) {
      this.logger.error("Errored while collecting packages and package graph", err);
      this._complete(null, 1);
      throw err;
    }
  }

  runCommand(callback) {
    this._attempt("initialize", () => {
      this._attempt("execute", () => {
        this._complete(null, 0, callback);
      }, callback);
    }, callback);
  }

  _attempt(method, next, callback) {
    const methodName = `${this.constructor.name}.${method}`;

    try {
      this.logger.verbose(`Attempting running ${methodName}`);

      this[method]((err, completed) => {
        if (err) {
          this.logger.error(`Errored while running ${methodName}`, err);
          this._complete(err, 1, callback);
        } else if (!completed) {
          this.logger.verbose(`Exited early while running ${methodName}`);
          this._complete(null, 1, callback);
        } else {
          this.logger.verbose(`Successfully ran ${methodName}`);
          next();
        }
      });
    } catch (err) {
      this.logger.error(`Errored while running ${methodName}`, err);
      this._complete(err, 1, callback);
    }
  }

  _complete(err, code, callback) {
    if (code !== 0) {
      const exitHandler = new ExitHandler();
      exitHandler.writeLogs();
    }

    const finish = function() {
      if (callback) {
        callback(err, code);
      }

      if (process.env.NODE_ENV !== "test") {
        process.exit(code);
      }
    };

    const childProcessCount = ChildProcessUtilities.getChildProcessCount();
    if (childProcessCount > 0) {
      logger.info(
        `Waiting for ${childProcessCount} child ` +
        `process${childProcessCount === 1 ? "" : "es"} to exit. ` +
        "CTRL-C to exit immediately."
      );
      ChildProcessUtilities.onAllExited(finish);
    } else {
      finish();
    }
  }

  _legacyOptions() {
    return ["bootstrap", "publish"].reduce((opts, command) => {
      if (this.name === command && this.repository.asiniJson[`${command}Config`]) {
        logger.warn(`\`${command}Config.ignore\` is deprecated.  Use \`commands.${command}.ignore\`.`);
        opts.ignore = this.repository.asiniJson[`${command}Config`].ignore;
      }
      return opts;
    }, {});
  }

  initialize() {
    throw new Error("command.initialize() needs to be implemented.");
  }

  execute() {
    throw new Error("command.execute() needs to be implemented.");
  }
}
