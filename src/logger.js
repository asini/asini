import progressBar from "./progressBar";
import chalk from "chalk";
import pad from "pad";

const cwd = process.cwd();

const DEFAULT_LOGLEVEL = "info";

const LEVELS = [
  [ "silly",   "magenta" ],
  [ "verbose", "blue"    ],
  [ "info",    "white"   ],
  [ "success", "green"   ],
  [ "warn",    "yellow"  ],
  [ "error",   "red"     ],
  [ "silent",            ],
];

const TYPE_TO_LEVEL = LEVELS
  .reduce((map, [type], index) => (map[type] = index, map), {});

class Logger {
  constructor() {
    this.setLogLevel();
    this.logs = [];
  }

  setLogLevel(type) {
    this.loglevel = TYPE_TO_LEVEL[type || DEFAULT_LOGLEVEL];
  }

  _log(type, style, level, message, error) {
    if (process.env.NODE_ENV !== "test") {
      this.logs.push({
        type,
        message,
        error
      });
    }

    if (level < this.loglevel) {
      return;
    }

    if (error) {
      message += "\n" + (error.stack || error);
    }

    if (style) {
      message = style(message);
    }

    progressBar.clear();
    this._emit(message);
    progressBar.restore();
  }

  _emit(message) {
    if (process.env.NODE_ENV !== "test") {
      console.log(message);
    }
  }

  newLine() {
    this._emit("");
  }

  logifyAsync(target, property, descriptor) {
    const message = target.name + "." + property;
    const method = descriptor.value;

    descriptor.value = function() {
      const args = [].slice.call(arguments);
      const callback = args.pop();
      const msg = logger._formatMethod(message, args);

      logger.silly(msg);

      // wrap final callback
      args.push((error, value) => {
        if (error) {
          logger.error(msg);
        } else {
          logger.silly(msg + " => " + logger._formatValue(value));
        }

        callback(error, value);
      });

      method.apply(this, args);
    };
  }

  logifySync(target, property, descriptor) {
    const message = target.name + "." + property;
    const method = descriptor.value;

    descriptor.value = function() {
      const args = [].slice.call(arguments);
      const msg = logger._formatMethod(message, args);

      logger.silly(msg);

      try {
        const result = method.apply(this, args);
        logger.silly(msg + " => " + logger._formatValue(result));
        return result;
      } catch (error) {
        logger.error(msg, error);
        throw error;
      }
    };
  }

  _formatMethod(method, args) {
    return pad(method, 30, " ") + "(" + this._formatArguments(args) + ")";
  }

  _formatArguments(args) {
    return args.map(this._formatValue).join(", ");
  }

  _formatValue(arg) {
    if (typeof arg === "function") {
      return "function " + arg.name + "() {...}";
    }

    return (JSON.stringify(arg) || "").replace(cwd, ".");
  }
}

LEVELS.forEach(([type, color]) => {
  if (!color) return; // "silent"
  const style = chalk[color];
  const level = TYPE_TO_LEVEL[type];
  Logger.prototype[type] = function(message, error) {
    this._log(type, style, level, message, error);
  };
});

const logger = new Logger();

export default logger;
