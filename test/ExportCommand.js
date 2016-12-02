import assert from "assert";
import exitWithCode from "./_exitWithCode";
import initFixture from "./_initFixture";
import ExportCommand from "../src/commands/ExportCommand";
import logger from "../src/logger";
import stub from "./_stub";

describe("ExportCommand", () => {

  describe("in a basic repo", () => {
    beforeEach((done) => {
      initFixture("ExportCommand/basic", done);
    });

    it("should export a single package", (done) => {
      const pkg = "package-1";
      const exportCommand = new ExportCommand([pkg], {"dry-run": true});

      exportCommand.runValidations();
      exportCommand.runPreparations();

      let index = 0;
      const patterns = [
        "The following directories would be moved",
        pkg
      ];
      stub(logger, "info", (message) => {
        assert.ok(message.includes(patterns[index]));
        index++;
      });

      exportCommand.runCommand(exitWithCode(0, done));
    });

    it("should export all packages", (done) => {
      const exportCommand = new ExportCommand([], {"dry-run": true});

      exportCommand.runValidations();
      exportCommand.runPreparations();

      let index = 0;
      const patterns = [
        "The following directories would be moved",
        "package-1",
        "package-2",
        "package-3",
        "package-4"
      ];
      stub(logger, "info", (message) => {
        assert.ok(message.includes(patterns[index]));
        index++;
      });

      exportCommand.runCommand(exitWithCode(0, done));
    });

    it("should allow you to specify a target directory", (done) => {
      const to = "/path/to/the/mls/cup";
      const pkg = "package-2";
      const exportCommand = new ExportCommand([pkg, to], {"dry-run": true});

      exportCommand.runValidations();
      exportCommand.runPreparations();

      let index = 0;
      const patterns = [
        "The following directories would be moved",
        pkg
      ];
      stub(logger, "info", (message) => {
        assert.ok(message.includes(patterns[index]));
        index++;
      });

      exportCommand.runCommand(exitWithCode(0, done));
    });
  });
});
