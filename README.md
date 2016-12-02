A tool for managing JavaScript projects with multiple packages.

[![NPM Status][npm-status-img]][npm-url]
[![Travis Status][travis-status-img]][travis-url]
[![Appveyor Status][appveyor-status-img]][appveyor-url]
[![Chat on Slack][slack-img]][slack-url]

## About

Splitting up large codebases into separate independently versioned packages
is extremely useful for code sharing. However, making changes across many
repositories is *messy* and difficult to track, and testing across repositories
gets complicated really fast.

To solve these (and many other) problems, some projects will organize their
codebases into multi-package repositories (sometimes called [monorepos](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)). Projects like [Babel](https://github.com/babel/babel/tree/master/packages), [React](https://github.com/facebook/react/tree/master/packages), [Angular](https://github.com/angular/angular/tree/master/modules),
[Ember](https://github.com/emberjs/ember.js/tree/master/packages), [Meteor](https://github.com/meteor/meteor/tree/devel/packages), [Jest](https://github.com/facebook/jest/tree/master/packages), and many others develop all of their packages within a
single repository.

**Asini is a tool that optimizes the workflow around managing multi-package
repositories with git and npm.**

Asini is a fork of [Lerna](https://github.com/lerna/lerna).

### What does an Asini repo look like?

There's actually very little to it. You have a file system that looks like this:

```
my-asini-repo/
  package.json
  packages/
    package-1/
      package.json
    package-2/
      package.json
```

### What can Asini do?

The two primary commands in Asini are `asini bootstrap` and `asini publish`.

`bootstrap` will link dependencies in the repo together.
`publish` will help publish any updated packages.

## Getting Started

Let's start by installing Asini globally with [npm](https://www.npmjs.com/).

```sh
$ npm install -g asini
```

Next we'll create a new [git](https://git-scm.com/) repository:

```sh
$ git init asini-repo
$ cd asini-repo
```

And now let's turn it into an Asini repo:

```sh
$ asini init
```

Your repository should now look like this:

```
asini-repo/
  package.json
  asini.json
```

This will create an `asini.json` configuration file as well as a `packages` folder.

## How it works

Asini allows you to manage your project using one of two modes: Fixed or Independent.

### Fixed/Locked mode (default)

Fixed mode Asini projects operate on a single version line. The version is kept in the `asini.json` file at the root of your project under the `version` key. When you run `asini publish`, if a module has been updated since the last time a release was made, it will be updated to the new version you're releasing. This means that you only publish a new version of a package when you need to.

This is the mode that [Babel](https://github.com/babel/babel) is currently using. Use this if you want to automatically tie all package versions together. One issue with this approach is that a major change in any package will result in all packages having a new major version.

### Independent mode (`--independent`)

Independent mode Asini projects allows maintainers to increment package versions independently of each other. Each time you publish, you will get a prompt for each package that has changed to specify if it's a patch, minor, major or custom change.

Independent mode allows you to more specifically update versions for each package and makes sense for a group of components. Combining this mode with something like [semantic-release](https://github.com/semantic-release/semantic-release) would make it less painful.

> The `version` key in `asini.json` is ignored in independent mode.

## Commands

### init

```sh
$ asini init
```

Create a new Asini repo or upgrade an existing repo to the current version of Asini.

> Asini assumes the repo has already been initialized with `git init`.

When run, this command will:
1. Add `asini` as a [`devDependency`](https://docs.npmjs.com/files/package.json#devdependencies) in `package.json` if it doesn't already exist.
2. Create an `asini.json` config file to store the `version` number.

#### --independent, -i

```sh
$ asini publish --independent
```

This flag tells Asini to use independent versioning mode.

### bootstrap

```sh
$ asini bootstrap
```

Bootstrap the packages in the current Asini repo.
Installs all of their dependencies and links any cross-dependencies.

When run, this command will:

1. `npm install` all external dependencies of each package.
2. Symlink together all Asini `packages` that are dependencies of each other.
3. `npm prepublish` all bootstrapped packages.

`asini bootstrap` respects the `--ignore` flag (see below).

#### How `bootstrap` works

Let's use `babel` as an example.

- `babel-generator` and `source-map` (among others) are dependencies of `babel-core`.
-  `babel-core`'s [`package.json`](https://github.com/babel/babel/blob/13c961d29d76ccd38b1fc61333a874072e9a8d6a/packages/babel-core/package.json#L28-L47) lists both these packages as keys in `dependencies`, as shown below.

```js
// babel-core package.json
{
  "name": "babel-core",
  ...
  "dependencies": {
    ...
    "babel-generator": "^6.9.0",
    ...
    "source-map": "^0.5.0"
  }
}
```

- Asini checks if each dependency is also part of the Asini repo.
  - In this example, `babel-generator` is part of the Asini repo, while `source-map` is not.
  - `source-map` is `npm install`ed like normal.
- `packages/babel-core/node_modules/babel-generator` symlinks to `packages/babel-generator`
- This allows nested directory imports

**Note:** Circular dependencies result in circular symlinks which *may* impact your editor/IDE.

[Webstorm](https://www.jetbrains.com/webstorm/) locks up when circular symlinks are present. To prevent this, add `node_modules` to the list of ignored files and folders in `Preferences | Editor | File Types | Ignored files and folders`.  

### publish

```sh
$ asini publish
```

Publish packages in the current Asini project. When run, this command does the following:

Creates a new release of the packages that have been updated.
Prompts for a new version.
Creates a new git commit/tag in the process of publishing to npm.

More specifically, this command will:

1. Publish each module in `packages` that has been updated since the last version to npm with the [dist-tag](https://docs.npmjs.com/cli/dist-tag) `asini-temp`.
  1. Run the equivalent of `asini updated` to determine which packages need to be published.
  2. If necessary, increment the `version` key in `asini.json`.
  3. Update the `package.json` of all updated packages to their new versions.
  4. Update all dependencies of the updated packages with the new versions.
  5. Create a new git commit and tag for the new version.
  6. Publish updated packages to npm.
2. Once all packages have been published, remove the `asini-temp` tags and add the tags to `latest`.

> A temporary dist-tag is used at the start to prevent the case where only some of the packages are published; this can cause issues for users installing a package that only has some updated packages.

> Asini won't publish packages which are marked as private (`"private": true` in the `package.json`).

#### --npm-tag [tagname]

```sh
$ asini publish --npm-tag=next
```

When run with this flag, `publish` will publish to npm with the given npm [dist-tag](https://docs.npmjs.com/cli/dist-tag) (defaults to `latest`).

This option can be used to publish a [`prerelease`](http://carrot.is/coding/npm_prerelease) or `beta` version.

> Note: the `latest` tag is the one that is used when a user runs `npm install my-package`.
> To install a different tag, a user can run `npm install my-package@prerelease`.

#### --canary, -c

```sh
$ asini publish --canary
```

When run with this flag, `publish` publishes packages in a more granular way (per commit). Before publishing to npm, it creates the new `version` tag by taking the current `version` and appending the current git sha (ex: `1.0.0-alpha.81e3b443`).

> The intended use case for this flag is a per commit level release or nightly release.

#### --skip-git

```sh
$ asini publish --skip-git
```

When run with this flag, `publish` will publish to npm without running any of the git commands.

> Only publish to npm; skip committing, tagging, and pushing git changes (this only affects publish).

This may be configured in asini.json via `skipGit` or `command.publish.skipGit`.

#### --skip-npm

```sh
$ asini publish --skip-npm
```

When run with this flag, `publish` will update all `package.json` package
versions and dependency versions, but it will not actually publish the
packages to npm.

This is useful as a workaround for an [npm
issue](https://github.com/npm/registry/issues/42) which prevents README updates
from appearing on npmjs.com when published via Asini.  When publishing with
README changes, use `--skip-npm` and do the final `npm publish` by hand for
each package.

This flag can be combined with `--skip-git` to _just_ update versions and
dependencies, without committing, tagging, pushing or publishing.

> Only update versions and dependencies; don't actually publish (this only affects publish).

This may be configured in asini.json via `skipNpm` or `command.publish.skipNpm`.

#### --force-publish [packages]

```sh
$ asini publish --force-publish=package-2,package-4
# force publish all packages
$ asini publish --force-publish=*
```

When run with this flag, `publish` will force publish the specified packages (comma-separated) or all packages using `*`.

> This will skip the `asini updated` check for changed packages and forces a package that didn't have a `git diff` change to be updated.

#### --yes

```sh
$ asini publish --canary --yes
# skips `Are you sure you want to publish the above changes?`
```

When run with this flag, `publish` will skip all confirmation prompts.
Useful in [Continuous integration (CI)](https://en.wikipedia.org/wiki/Continuous_integration) to automatically answer the publish confirmation prompt.

#### --repo-version

```sh
$ asini publish --repo-version 1.0.1
# applies version and skips `Select a new version for...` prompt
```

When run with this flag, `publish` will skip the version selection prompt and use the specified version.
Useful for bypassing the user input prompt if you already know which version to publish.

### updated

```sh
$ asini updated
```

Check which `packages` have changed since the last release (the last git tag).

Asini determines the last git tag created and runs `git diff --name-only v6.8.1` to get all files changed since that tag. It then returns an array of packages that have an updated file.


**Note that configuration for the `publish` command _also_ affects the
`updated` command.  For example `config.publish.ignore`**

### clean

```sh
$ asini clean
```

Remove the `node_modules` directory from all packages.

### diff

```sh
$ asini diff [package?]

$ asini diff
# diff a specific package
$ asini diff package-name
```

Diff all packages or a single package since the last release.

> Similar to `asini updated`. This command runs `git diff`.

### ls

```sh
$ asini ls
```

List all of the public packages in the current Asini repo.

### run

```sh
$ asini run [script] # runs npm run my-script in all packages that have it
$ asini run test
$ asini run build
```

Run an [npm script](https://docs.npmjs.com/misc/scripts) in each package that contains that script.

`asini run` respects the `--concurrency` flag (see below).

`asini run` respects the `--scope` flag (see below).

```sh
$ asini run --scope my-component test
```

### exec

```sh
$ asini exec -- [command] # runs the command in all packages
$ asini exec -- rm -rf ./node_modules
$ asini exec -- protractor conf.js
```

Run an arbitrary command in each package.

`asini exec` respects the `--concurrency` flag (see below).

`asini exec` respects the `--scope` flag (see below).

```sh
$ asini exec --scope my-component -- ls -la
```

> Hint: The commands are spawned in parallel, using the concurrency given.
> The output is piped through, so not deterministic.
> If you want to run the command in one package after another, use it like this:

```sh
$ asini exec --concurrency 1 -- ls -la
```

### import

```sh
$ asini import <path-to-external-repository>
```

Import the package at `<path-to-external-repository>`, with commit history,
into `packages/<directory-name>`.  Original commit authors, dates and messages
are preserved.  Commits are applied to the current branch.

This is useful for gathering pre-existing standalone packages into an Asini
repo.  Each commit is modified to make changes relative to the package
directory.  So, for example, the commit that added `package.json` will
instead add `packages/<directory-name>/package.json`.

### export

```sh
$ asini export <package-name> --to <path-to-external-directory>
```

Export the package at `<package-name>` into a new directory, at
`<path-to-external-directory>`, if it is given, or to the current user's home
directory, if it is not.

This allows you to move packages out of an existing asini repository and into
its own repository, in case it turns out to be easier to manage on its own.

## Misc

Asini will log to a `asini-debug.log` file (same as `npm-debug.log`) when it encounters an error running a command.

Asini also has support for [scoped packages](https://docs.npmjs.com/misc/scope).

Running `asini` without arguments will show all commands/options.

### asini.json

```js
{
  "asini": "x.x.x",
  "version": "1.1.3",
  "commands": {
    "publish": {
      "ignore": [
        "ignored-file",
        "*.md"
      ]
    }
  }
}
```

- `asini`: the current version of Asini being used.
- `version`: the current version of the repository.
- `commands.publish.ignore`: an array of globs that won't be included in `asini updated/publish`. Use this to prevent publishing a new version unnecessarily for changes, such as fixing a `README.md` typo.
- `linkedFiles.prefix`: a prefix added to linked dependency files.

### Common `devDependencies`

Most `devDependencies` can be pulled up to the root of an Asini repo.

This has a few benefits:

- All packages use the same version of a given dependency
- Can keep dependencies at the root up-to-date with an automated tool such as [GreenKeeper](https://greenkeeper.io/)
- Dependency installation time is reduced
- Less storage is needed

Note that `devDependencies` providing "binary" executables that are used by
npm scripts still need to be installed directly in each package where they're
used.

For example the `nsp` dependency is necessary in this case for `asini run nsp`
(and `npm run nsp` within the package's directory) to work correctly:

```json

{
  "scripts": {
    "nsp": "nsp"
  },
  "devDependencies": {
    "nsp": "^2.3.3"
  }
}
```

### Flags

Options to Asini can come from configuration (`asini.json`) or on the command
line.  Additionally options in config can live at the top level or may be
applied to specific commands.

Example:

```json
{
  "asini": "x.x.x",
  "version": "1.2.0",
  "exampleOption": "foo",
  "command": {
    "init": {
      "exampleOption": "bar",
    }
  },
}
```

In this case `exampleOption` will be "foo" for all commands except `init`,
where it will be "bar".  In all cases it may be overridden to "baz" on the
command-line with `--example-option=baz`.

#### --concurrency

How many threads to use when Asini parallelizes the tasks (defaults to `4`)

```sh
$ asini publish --concurrency 1
```

#### --scope [glob]

Scopes a command to a subset of packages.

```sh
$ asini exec --scope my-component -- ls -la
```

```sh
$ asini run --scope toolbar-* test
```

#### --ignore [glob]

Excludes a subset of packages when running the `bootstrap` command.

```sh
$ asini bootstrap --ignore component-*
```

The `ignore` flag, when used with the `bootstrap` command, can also be set in
`asini.json` at the top level or under the `commands.bootstrap` key. The
command-line flag will take precendence over this option.

**Example**

```javascript
{
  "asini": "x.x.x",
  "version": "0.0.0",
  "commands": {
    "bootstrap": {
      "ignore": "component-*"
    }
  }
}
```

> Hint: The glob is matched against the package name defined in `package.json`,
> not the directory name the package lives in.

#### --only-explicit-updates

Only will bump versions for packages that have been updated explicitly rather than cross-dependencies.

> This may not make sense for a major version bump since other packages that depend on the updated packages wouldn't be updated.

```sh
$ asini updated --only-explicit-updates
$ asini publish --only-explicit-updates
```

Ex: in Babel, `babel-types` is depended upon by all packages in the monorepo (over 100). However, Babel uses `^` for most of it's dependencies so it isn't necessary to bump the versions of all packages if only `babel-types` is updated. This option allows only the packages that have been explicitly updated to make a new version.

#### --loglevel [silent|error|warn|success|info|verbose|silly]

What level of logs to report.  On failure, all logs are written to asini-debug.log in the current working directory.

Any logs of a higher level than the setting are shown.  The default is "info".

#### --hoist [glob]

Install external dependencies matching `glob` at the repo root so they're
available to all packages.  Any binaries from these dependencies will be
linked into dependent package `node_modules/.bin/` directories so they're
available for npm scripts.  If no `glob` is given the default is `**` (hoist
everything).  This option only affects the `bootstrap` command.

```sh
$ asini bootstrap --hoist
```

Note: If packages depend on different _versions_ of an external dependency,
the most commonly used version will be hoisted, and a warning will be emitted.

#### --nohoist [glob]

Do _not_ install external dependencies matching `glob` at the repo root.  This
can be used to opt out of hoisting for certain dependencies.

```sh
$ asini bootstrap --hoist --nohoist=babel-*
```

[npm-status-img]: https://img.shields.io/npm/v/asini.svg?style=flat
[npm-url]: https://www.npmjs.com/package/asini
[travis-status-img]: https://img.shields.io/travis/asini/asini/master.svg?style=flat&label=travis
[travis-url]: https://travis-ci.org/asini/asini
[appveyor-status-img]: https://img.shields.io/appveyor/ci/gigabo/asini.svg
[appveyor-url]: https://ci.appveyor.com/project/gigabo/asini
[slack-url]: https://slack.asini.io/
[slack-img]: https://slack.asini.io/badge.svg
