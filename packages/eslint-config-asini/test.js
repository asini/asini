// Let's at least make sure we can require our config find something inside
// where we expect it to be.
require("assert").equal(require(".").extends, "babel");
