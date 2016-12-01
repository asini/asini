import assert from "assert";
import exitWithCode from "./_exitWithCode";
import initFixture from "./_initFixture";
import EjectCommand from "../src/commands/EjectCommand";
import logger from "../src/logger";
import stub from "./_stub";

describe("EjectCommand", () => {

  describe("in a basic repo", () => {
    beforeEach((done) => {
      initFixture("EjectCommand/basic", done);
    });

    it("should eject a single package", (done) => {
      const pkg = "package-1";
      const ejectCommand = new EjectCommand([pkg], {dry: true});

      ejectCommand.runValidations();
      ejectCommand.runPreparations();

      let index = 0;
      const patterns = [
        "The following directories would be moved",
        pkg
      ];
      stub(logger, "info", (message) => {
        assert.ok(message.includes(patterns[index]));
        index++;
      });

      ejectCommand.runCommand(exitWithCode(0, done));
    });

    it("should eject all packages", (done) => {
      const ejectCommand = new EjectCommand([], {dry: true});

      ejectCommand.runValidations();
      ejectCommand.runPreparations();

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

      ejectCommand.runCommand(exitWithCode(0, done));
    });

    it("should allow you to specify a target directory", (done) => {
      const to = "/my/really/great/path";
      const pkg = "package-2";
      const ejectCommand = new EjectCommand([pkg], {dry: true, to});

      ejectCommand.runValidations();
      ejectCommand.runPreparations();

      let index = 0;
      const patterns = [
        "The following directories would be moved",
        pkg
      ];
      stub(logger, "info", (message) => {
        assert.ok(message.includes(patterns[index]));
        index++;
      });

      ejectCommand.runCommand(exitWithCode(0, done));
    });
  });
});
