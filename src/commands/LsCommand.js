import Command from "../Command";

export default class LsCommand extends Command {
  initialize(callback) {
    // Nothing to do...
    callback(null, true);
  }

  execute(callback) {
    const formattedPackages = this.packages
      .map((pkg) => `- ${pkg.name}${pkg.isPrivate() ? " (private)" : ""}`)
      .join("\n");

    this.logger.info(formattedPackages);
    callback(null, true);
  }
}
