import assert from "assert";

import assertStubbedCalls from "./_assertStubbedCalls";
import FileSystemUtilities from "../src/FileSystemUtilities";
import PackageUtilities from "../src/PackageUtilities";
import GitUtilities from "../src/GitUtilities";
import initFixture from "./_initFixture";
import logger from "../src/logger";
import stub from "./_stub";
import path from "path";

import Repository from "../src/Repository";

describe("Repository", () => {
  let isInitialized;
  let testDir;

  beforeEach((done) => {
    isInitialized = true;
    testDir = initFixture("Repository/basic", done);

    stub(GitUtilities, "isInitialized", () => isInitialized);
    stub(GitUtilities, "getTopLevelDirectory", () => testDir);
  });

  it("initializes git repo if necessary", () => {
    isInitialized = false;
    let calledLogger;
    let calledGitInit;

    stub(logger, "info", (message) => {
      calledLogger = true;
      assert.equal(message, "Initializing Git repository.");
    });
    stub(GitUtilities, "init", () => {
      calledGitInit = true;
    });

    new Repository();

    assert.ok(calledLogger, "message was logged");
    assert.ok(calledGitInit, "git init was called");
  });

  describe(".rootPath", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.equal(repo.rootPath, testDir);
    });
  });

  describe(".asiniJsonLocation", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.equal(repo.asiniJsonLocation, path.join(testDir, "asini.json"));
    });
  });

  describe(".packageJsonLocation", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.equal(repo.packageJsonLocation, path.join(testDir, "package.json"));
    });
  });

  describe(".packagesLocation", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.equal(repo.packagesLocation, path.join(testDir, "packages"));
    });
  });

  describe(".versionLocation", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.equal(repo.versionLocation, path.join(testDir, "VERSION"));
    });
  });

  describe(".asiniJson", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.deepEqual(repo.asiniJson, {
        "asini": "500.0.0",
        "version": "1.0.0"
      });
    });

    it("should default to an empty object", () => {
      stub(FileSystemUtilities, "existsSync", (location) =>
        location !== path.join(testDir, "asini.json")
      );
      const repo = new Repository();
      assert.deepEqual(repo.asiniJson, {});
    });
  });

  describe(".packageJson", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.deepEqual(repo.packageJson, {
        "name": "test",
        "devDependencies": {
          "asini": "500.0.0",
          "external": "^1.0.0"
        }
      });
    });

    it("should remain undefined when package.json missing", () => {
      stub(FileSystemUtilities, "existsSync", (location) =>
        location !== path.join(testDir, "package.json")
      );
      const repo = new Repository();
      assert.equal(repo.packageJson, undefined);
    });
  });

  describe(".package", () => {
    it("should be added to the instance", () => {
      const repo = new Repository();
      assert.ok(repo.package);
    });

    it("should be an instance of Package", () => {
      const repo = new Repository();
      assert.ok(repo.package.constructor, "should have a constructor");
      assert.equal(repo.package.constructor.name, "Package");
    });
  });

  describe("get .asiniVersion", () => {
    it("should return the asini key from asini.json", () => {
      const repo = new Repository();
      assert.equal(repo.asiniVersion, "500.0.0");
    });
  });

  describe("get .version", () => {
    it("should return the version key from asini.json", () => {
      const repo = new Repository();
      assert.equal(repo.version, "1.0.0");
    });
  });

  describe("get .nodeModulesLocation", () => {
    it("should return the root node_modules location", () => {
      const repo = new Repository();
      assert.equal(repo.nodeModulesLocation, path.join(testDir, "node_modules"));
    });
  });

  describe("get .packageConfigs", () => {
    it("should return the default packageConfigs", () => {
      const repo = new Repository();
      assert.deepEqual(repo.packageConfigs, [{
        glob: "packages/*/package.json"
      }]);
    });

    it("should return custom packageConfigs", () => {
      const repo = new Repository();
      const customPackages = repo.asiniJson.packages = [{
        glob: "package.json"
      }, {
        glob: "my-packages/*/package.json"
      }];
      assert.deepEqual(repo.packageConfigs, customPackages);
    });
  });

  describe("get .packages", () => {
    it("should return the packages", () => {
      const repo = new Repository();
      assert.ok(Array.isArray(repo.packages));
      assert.ok(repo.packages.length === 0);
      assert.strictEqual(repo.packages, repo.packages, "getter should use cached value");
    });
  });

  describe("get .filteredPackages", () => {
    it("should return the filteredPackages", () => {
      const repo = new Repository();
      assert.ok(Array.isArray(repo.filteredPackages));
      assert.ok(repo.filteredPackages.length === 0);
      assert.strictEqual(repo.filteredPackages, repo.filteredPackages, "getter should use cached value");
    });
  });

  describe("get .packageGraph", () => {
    it("should return the packageGraph", () => {
      const repo = new Repository();
      assert.ok(repo.packageGraph);
      assert.ok(repo.packageGraph.constructor, "packageGraph did not have a constructor");
      assert.equal(repo.packageGraph.constructor.name, "PackageGraph");
      assert.strictEqual(repo.packageGraph, repo.packageGraph, "getter should use cached value");
    });
  });

  describe("buildPackageGraph()", () => {
    it("calls expected utilities", () => {
      const repo = new Repository();

      const packages = [];
      const packageGraph = {};
      const filteredPackages = [];

      assertStubbedCalls([
        [PackageUtilities, "getPackages", {}, [
          { args: [repo], returns: packages }
        ]],
        [PackageUtilities, "getPackageGraph", {}, [
          { args: [packages], returns: packageGraph }
        ]],
        [PackageUtilities, "getFilteredPackages", {}, [
          { args: [packages, { scope: undefined, ignore: undefined }], returns: filteredPackages }
        ]]
      ]);

      repo.buildPackageGraph();
    });
  });

  describe("hasCompatibleLocalAsini()", () => {
    it("should return true when asini major version matches", () => {
      const repo = new Repository();
      assert.strictEqual(repo.hasCompatibleLocalAsini("500.250.0"), true);
    });

    it("should return true when asiniVersion is identical", () => {
      const repo = new Repository();
      assert.strictEqual(repo.hasCompatibleLocalAsini("500.0.0"), true);
    });

    it("should return false when asini major version does not match", () => {
      const repo = new Repository();
      assert.strictEqual(repo.hasCompatibleLocalAsini("1000.0.0"), false);
    });
  });

  describe("hasDependencyInstalled()", () => {
    it("should match installed dependency", () => {
      const repo = new Repository();
      assert.strictEqual(repo.hasDependencyInstalled("external", "^1"), true);
    });

    it("should not match non-installed dependency", () => {
      const repo = new Repository();
      assert.strictEqual(repo.hasDependencyInstalled("missing", "^1"), false);
    });

    it("should not match installed dependency with non-matching version", () => {
      const repo = new Repository();
      assert.strictEqual(repo.hasDependencyInstalled("external", "^2"), false);
    });
  });

  describe("isIndependent()", () => {
    it("should return if the repository versioning is independent", () => {
      const repo = new Repository();
      assert.strictEqual(repo.isIndependent(), false);

      repo.asiniJson.version = "independent";
      assert.strictEqual(repo.isIndependent(), true);
    });
  });
});
