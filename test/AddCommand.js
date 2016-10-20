import FileSystemUtilities from "../src/FileSystemUtilities";
import ChildProcessUtilities from "../src/ChildProcessUtilities";
import NpmUtilities from "../src/NpmUtilities";
import exitWithCode from "./_exitWithCode";
import initFixture from "./_initFixture";
import AddCommand from "../src/commands/AddCommand";
import assert from "assert";
import stub from "./_stub";
import path from "path";
import pathExists from "path-exists";

describe("AddCommand", () => {

  let testDir;

  beforeEach((done) => {
    testDir = initFixture("AddCommand/basic", done);
  });

  it("should add a dependency", (done) => {
    const addCommand = new AddCommand(["an-external-dep@1.0.0"], {});

    addCommand.runValidations();
    addCommand.runPreparations();

    let pkg = 1;
    stub(FileSystemUtilities, "writeFile", (fn, value, callback) => {

      assert.equal(fn, path.join(testDir, `packages/package-${pkg}/package.json`));
      assert.equal(JSON.parse(value).dependencies["an-external-dep"], "1.0.0");

      pkg++;
      callback();
    });

    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {
      callback();
    });

    addCommand.runCommand(exitWithCode(0, (err) => {
      assert.ok(!pathExists.sync(path.join(testDir, "asini-debug.log")), "asini-debug.log should not exist");
      done(err);
    }));

  });

  it("should install added dependency", (done) => {
    const addCommand = new AddCommand(["an-external-dep@1.0.0"], {});

    addCommand.runValidations();
    addCommand.runPreparations();

    let pkg = 1;
    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {

      assert.deepEqual(args, ["install", "an-external-dep@1.0.0"]);
      assert.equal(options.cwd, path.join(testDir, "packages/package-" + pkg));

      pkg++;
      callback();
    });

    addCommand.runCommand(exitWithCode(0, (err) => {
      assert.ok(!pathExists.sync(path.join(testDir, "asini-debug.log")), "asini-debug.log should not exist");
      done(err);
    }));

  });

  it("should get a default version from npm", (done) => {
    const addCommand = new AddCommand(["an-external-dep"], {});

    addCommand.runValidations();
    addCommand.runPreparations();

    stub(NpmUtilities, "getLatestVersion", (pkg, callback) => {
      callback(null, "1.0.1");
    });

    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {

      assert.equal(args[1], "an-external-dep@^1.0.1");

      callback();
    });

    addCommand.runCommand(exitWithCode(0, done));

  });

  it("should hoist", (done) => {
    const addCommand = new AddCommand(["an-external-dep@1.0.0"], {hoist: true});

    addCommand.runValidations();
    addCommand.runPreparations();

    let calls = 0;
    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {

      assert.equal(args[1], "an-external-dep@1.0.0");
      assert.equal(options.cwd, testDir);

      assert.ok(!calls++, "Only called once");

      callback();
    });

    addCommand.runCommand(exitWithCode(0, done));

  });

  it("should respect scope", (done) => {
    const addCommand = new AddCommand(["an-external-dep@1.0.0"], {scope: "package-1"});

    addCommand.runValidations();
    addCommand.runPreparations();

    let calls = 0;
    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {

      assert.equal(options.cwd, path.join(testDir, "packages/package-1"));

      assert.ok(!calls++, "Only called once");

      callback();
    });

    addCommand.runCommand(exitWithCode(0, done));

  });

  it("should handle multiple scopes", (done) => {
    const addCommand = new AddCommand(["an-external-dep@1.0.0"], {scope: [
      "package-1",
      "package-2",
    ]});

    addCommand.runValidations();
    addCommand.runPreparations();

    let pkg = 0;
    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {

      assert.equal(options.cwd, path.join(testDir, "packages/package-" + ++pkg));

      callback();
    });

    addCommand.runCommand(exitWithCode(0, (err) => {
      assert.equal(pkg, 2, "Saw both packages");
      done(err);
    }));

  });
});
