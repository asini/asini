import assert from "assert";
import exitWithCode from "./_exitWithCode";
import initFixture from "./_initFixture";
import ExportCommand from "../src/commands/ExportCommand";
import FileSystemUtilities from "../src/FileSystemUtilities";
import userHome from "user-home";
import logger from "../src/logger";
import stub from "./_stub";
import path from "path";
import assertStubbedCalls from "./_assertStubbedCalls";

describe("ExportCommand", () => {

  let testDir;
  describe("in a basic repo", () => {
    beforeEach((done) => {
      testDir = initFixture("ExportCommand/basic", done);
    });

    it("should export all packages", (done) => {
      const exportCommand = new ExportCommand([], {"dry-run": true});

      exportCommand.runValidations();
      exportCommand.runPreparations();

      stub(FileSystemUtilities, "renameSync", () => {});
      assertStubbedCalls([
        [FileSystemUtilities, "renameSync", { nodeCallback: true }, [
          { location: path.join(testDir, "package-1"), to: userHome }
        ]],
        [FileSystemUtilities, "renameSync", { nodeCallback: true }, [
          { location: path.join(testDir, "package-2"), to: userHome }
        ]],
        [FileSystemUtilities, "renameSync", { nodeCallback: true }, [
          { location: path.join(testDir, "package-3"), to: userHome }
        ]],
        [FileSystemUtilities, "renameSync", { nodeCallback: true }, [
          { location: path.join(testDir, "package-4"), to: userHome }
        ]]
      ]);

      exportCommand.runCommand(exitWithCode(0, done));
    });

    it("should export a single package", (done) => {
      const to = "/path/to/the/mls/cup";
      const pkg = "package-2";
      const exportCommand = new ExportCommand([pkg, to], {"dry-run": true});

      exportCommand.runValidations();
      exportCommand.runPreparations();

      stub(FileSystemUtilities, "renameSync", (location, to) => {
        assert.ok(location.contains(pkg));
        assert.equals(to, userHome);
      });

      exportCommand.runCommand(exitWithCode(0, done));
    });

    describe("while doing a dry run", () => {
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
});
