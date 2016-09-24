import pathExists from "path-exists";
import logger from "./logger";
import mkdirp from "mkdirp";
import rimraf from "rimraf";
import fs from "fs";

const ENDS_WITH_NEW_LINE = /\n$/;

function ensureEndsWithNewLine(string) {
  return ENDS_WITH_NEW_LINE.test(string) ? string : string + "\n";
}

export default class FileSystemUtilities {
  @logger.logifyAsync
  static access(filePath, callback) {
    fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK, callback);
  }

  @logger.logifySync
  static mkdirSync(filePath) {
    fs.mkdirSync(filePath);
  }

  @logger.logifyAsync
  static mkdirp(filePath, callback) {
    mkdirp(filePath, callback);
  }

  @logger.logifyAsync
  static readdir(dirPath, callback) {
    fs.readdir(dirPath, callback);
  }

  @logger.logifySync
  static readdirSync(filePath) {
    return fs.readdirSync(filePath);
  }

  @logger.logifySync
  static existsSync(filePath) {
    return pathExists.sync(filePath);
  }

  @logger.logifyAsync
  static writeFile(filePath, fileContents, callback) {
    fs.writeFile(filePath, ensureEndsWithNewLine(fileContents), callback);
  }

  @logger.logifySync
  static writeFileSync(filePath, fileContents) {
    fs.writeFileSync(filePath, ensureEndsWithNewLine(fileContents));
  }

  @logger.logifyAsync
  static readFile(filePath, callback) {
    fs.readFile(filePath, callback);
  }

  @logger.logifySync
  static readFileSync(filePath) {
    return fs.readFileSync(filePath, "utf-8").toString().trim();
  }

  @logger.logifyAsync
  static rimraf(filePath, callback) {
    rimraf(filePath, callback);
  }

  @logger.logifyAsync
  static symlink(src, dest, type, callback) {
    fs.lstat(dest, (err) => {
      if (!err) {
        // Something exists at `dest`.  Need to remove it first.
        fs.unlink(dest, () => fs.symlink(src, dest, type, callback));
      } else {
        fs.symlink(src, dest, type, callback);
      }
    });
  }

  @logger.logifySync
  static unlinkSync(filePath) {
    fs.unlinkSync(filePath);
  }

  @logger.logifySync
  static isSymlink(path) {
    const lstat = fs.lstatSync(path);
    return lstat && lstat.isSymbolicLink()
      ? fs.readlinkSync(path)
      : false;
  }
}
