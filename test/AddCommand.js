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

    const want = [1,2,3,4].reduce((m, v) => {
      m[path.join(testDir, `packages/package-${v}/package.json`)] = true;
      return m;
    }, {});
    const got = {};
    stub(FileSystemUtilities, "writeFile", (fn, value, callback) => {

      got[fn] = true;
      assert.equal(JSON.parse(value).dependencies["an-external-dep"], "1.0.0");

      callback();
    });

    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {
      callback();
    });

    addCommand.runCommand(exitWithCode(0, (err) => {
      assert.ok(!pathExists.sync(path.join(testDir, "asini-debug.log")), "asini-debug.log should not exist");
      assert.deepEqual(want, got, "Wrote our package.jsons");
      done(err);
    }));

  });

  it("should install added dependency", (done) => {
    const addCommand = new AddCommand(["an-external-dep@1.0.0"], {});

    addCommand.runValidations();
    addCommand.runPreparations();

    let pkg = 1;
    stub(NpmUtilities, "installInDir", (dir, deps, callback) => {

      assert.deepEqual(deps, ["an-external-dep@1.0.0"]);
      assert.equal(dir, path.join(testDir, "packages/package-" + pkg));

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

    stub(NpmUtilities, "installInDir", (dir, deps, callback) => {

      assert.deepEqual(deps, ["an-external-dep@^1.0.1"]);

      callback();
    });

    addCommand.runCommand(exitWithCode(0, done));

  });

  it("should hoist", (done) => {
    const addCommand = new AddCommand(["an-external-dep@1.0.0"], {hoist: true});

    addCommand.runValidations();
    addCommand.runPreparations();

    let calls = 0;
    stub(NpmUtilities, "installInDir", (dir, deps, callback) => {

      assert.deepEqual(deps, ["an-external-dep@1.0.0"]);
      assert.equal(dir, testDir);

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

    const want = {
      [path.join(testDir, "packages/package-1")]: true,
      [path.join(testDir, "packages/package-2")]: true,
    };
    const got = {};
    stub(ChildProcessUtilities, "spawn", (command, args, options, callback) => {

      got[options.cwd] = true;

      callback();
    });

    addCommand.runCommand(exitWithCode(0, (err) => {
      assert.deepEqual(got, want, "Saw both packages");
      done(err);
    }));

  });
});
