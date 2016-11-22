import assert from "assert";

import BootstrapUtilities from "../src/BootstrapUtilities";

describe("BootstrapUtilities", () => {
  describe(".createBinaryLink()", () => {
    it("should exist", () => {
      assert.ok(BootstrapUtilities.createBinaryLink);
    });
  });

  describe(".getDependenciesToInstall()", () => {
    it("should exist", () => {
      assert.ok(BootstrapUtilities.getDependenciesToInstall);
    });
  });

  describe(".hoistedDirectory()", () => {
    it("should exist", () => {
      assert.ok(BootstrapUtilities.hoistedDirectory);
    });
  });

  describe(".hoistedPackageJson()", () => {
    it("should exist", () => {
      assert.ok(BootstrapUtilities.hoistedPackageJson);
    });
  });

  describe(".installExternalDependencies()", () => {
    it("should exist", () => {
      assert.ok(BootstrapUtilities.installExternalDependencies);
    });
  });
});
