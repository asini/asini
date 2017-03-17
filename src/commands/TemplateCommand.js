import Command from "../Command";
import FileSystemUtilities from "../FileSystemUtilities";
import merge from "lodash.merge";
import path from "path";
import template from "lodash.template";

export default class TemplateCommand extends Command {
  initialize(callback) {
    // Nothing to do...
    callback(null, true);
  }

  execute(callback) {
    let {packageJsonLocation, asiniJson, asiniJsonLocation} = this.repository;

    const templateName = this.input[0];
    const packageName = this.input[1];
    const templatesDir = path.join(path.dirname(packageJsonLocation), asiniJson.templatesDir || 'templates');

    let arg = {
      packageName,
      packageNames: this.packages
        .map((pkg) => pkg.name),

      publicPackageNames: this.packages
        .filter((pkg) => !pkg.isPrivate())
        .map((pkg) => pkg.name)
    }
    merge(arg, asiniJson);

    Promise.all([new Promise((resolve, reject) => {
      FileSystemUtilities.readdir(path.join(templatesDir, templateName), (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    }), new Promise((resolve, reject) => {
      const packageDir = path.join(path.dirname(asiniJsonLocation), 'packages', packageName);
      FileSystemUtilities.access(packageDir, (err) => {
        if (err) {
          FileSystemUtilities.mkdirp(packageDir, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(packageDir);
            }
          });
        } else {
          resolve(packageDir);
        }
      });
    })]).then(([templates, packageDir]) => {
      return Promise.all(templates.map(t => {
        return new Promise((resolve, reject) => {
          const templatePath = path.join(templatesDir, templateName, t);
          FileSystemUtilities.readFile(templatePath, (err, contents) => {
            if (err) {
              reject(err);
            } else {
              const destPath = path.join(path.dirname(asiniJsonLocation), 'packages', packageName, t);
              FileSystemUtilities.writeFile(destPath, template(contents, {})(arg), (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          });
        });
      }));
    }).then(() => {
      callback(null, true);
    }).catch(callback);
  }
}
