#!/usr/bin/env node

/* eslint-disable no-var */
// file must remain raw ES5

var chalk = require("chalk");
var lib = require(".");

var Changelog = lib.Changelog;
var ConfigurationError = lib.ConfigurationError;

try {
  console.log((new Changelog()).createMarkdown());
} catch (e) {
  if (e instanceof ConfigurationError) {
    console.log(chalk.red(e.message));
  } else {
    throw (e);
  }
}
