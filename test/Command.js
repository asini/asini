import assert from "assert";

import progressBar from "../src/progressBar";
import initFixture from "./_initFixture";
import Command from "../src/Command";
import logger from "../src/logger";

describe("Command", () => {
  describe(".input", () => {
    it("should be added to the instance", () => {
      const command = new Command(["a", "b", "c"]);
      assert.deepEqual(command.input, ["a", "b", "c"]);
    });
  });

  describe(".flags", () => {
    it("should be added to the instance", () => {
      const command = new Command(null, { foo: "bar" });
      assert.deepEqual(command.flags, { foo: "bar" });
    });
  });

  describe(".asiniVersion", () => {
    it("should be added to the instance", () => {
      const command = new Command();
      assert.deepEqual(command.asiniVersion, require("../package.json").version);
    });
  });

  describe(".progressBar", () => {
    it("should be added to the instance", () => {
      const command = new Command();
      assert.equal(command.progressBar, progressBar);
    });
  });

  describe(".logger", () => {
    it("should be added to the instance", () => {
      const command = new Command();
      assert.equal(command.logger, logger);
    });
  });

  describe(".concurrency", () => {
    it("should be added to the instance", () => {
      const command = new Command(null, {concurrency: 6});
      assert.equal(command.concurrency, 6);
    });

    it("should fall back to default if concurrency given is NaN", () => {
      const command = new Command(null, {concurrency: "bla"});
      assert.equal(command.concurrency, 4);
    });

    it("should fall back to default if concurrency given is 0", () => {
      assert.equal(new Command(null, {concurrency: 0}).concurrency, 4);
    });

    it("should fall back to 1 if concurrency given is smaller than 1", () => {
      assert.equal(new Command(null, {concurrency: -1}).concurrency, 1);
    });
  });

  describe(".run()", () => {
    it("should exist", (done) => {
      class TestCommand extends Command {
        initialize(callback) { callback(null, true); }
        execute() {

          done();
        }
      }

      const testCommand = new TestCommand([], {});
      testCommand.run();
    });
  });

  describe(".getOptions()", () => {
    beforeEach((done) => {
      initFixture("Command/basic", done);
    });

    class TestACommand extends Command {
    }
    class TestBCommand extends Command {
    }
    class TestCCommand extends Command {
      get otherCommandConfigs() {
        return ["testb"];
      }
    }

    it("should pick up global options", () => {
      assert.equal(new TestACommand([], {}).getOptions().testOption, "default");
    });

    it("should override global options with command-level options", () => {
      assert.equal(new TestBCommand([], {}).getOptions().testOption, "b");
    });

    it("should override global options with inherited command-level options", () => {
      assert.equal(new TestCCommand([], {}).getOptions().testOption, "b");
    });

    it("should override inherited command-level options with local command-level options", () => {
      assert.equal(new TestCCommand([], {}).getOptions().testOption2, "c");
    });

    it("should override command-level options with passed-in options", () => {
      assert.equal(new TestCCommand([], {}).getOptions({testOption2: "p"}).testOption2, "p");
    });

    it("should sieve properly within passed-in options", () => {
      assert.equal(new TestCCommand([], {}).getOptions({testOption2: "p"}, {testOption2: "p2"}).testOption2, "p2");
    });

    it("should override everything with a CLI flag", () => {
      assert.equal(new TestCCommand([], {testOption2: "f"}).getOptions({testOption2: "p"}).testOption2, "f");
    });

  });
});
