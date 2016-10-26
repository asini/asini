## v1.1.0 (2016-10-26)

#### Enhancement
  * [#45](https://github.com/asini/asini/pull/45) Install with no arguments. ([@gigabo](https://github.com/gigabo))
  * [#41](https://github.com/asini/asini/pull/41) Reduce the log level of some command output. ([@gigabo](https://github.com/gigabo))
  * [#44](https://github.com/asini/asini/pull/44) Wait a second before complaining about orphans. ([@gigabo](https://github.com/gigabo))
  * [#43](https://github.com/asini/asini/pull/43) Log stdout when commands fail. ([@seansfkelley](https://github.com/seansfkelley))
  * [#36](https://github.com/asini/asini/pull/36) Automatic hoisting of common dependencies to repo root. ([@gigabo](https://github.com/gigabo))

#### Bug fix
  * [#42](https://github.com/asini/asini/pull/42) Fix a sync/async decorator typo. ([@gigabo](https://github.com/gigabo))

#### Commiters: 4
- Bo Borgerson ([gigabo](https://github.com/gigabo))
- Ry Racherbaumer ([rygine](https://github.com/rygine))
- Sean Kelley ([seansfkelley](https://github.com/seansfkelley))
- Sresan Thevarajah ([sresant](https://github.com/sresant))

## v1.0.1 (2016-10-12)

#### Enhancement
  * [#38](https://github.com/asini/asini/pull/38) Make asini an asini repo. ([@gigabo](https://github.com/gigabo))

#### Bug fix
  * [#34](https://github.com/asini/asini/pull/34) Resolve symlink path on windows to add trailing slash.. ([@garyjN7](https://github.com/garyjN7))
  * [#35](https://github.com/asini/asini/pull/35) fix: lerna init assumes lerna in devDependencies. ([@joscha](https://github.com/joscha))
  * [#33](https://github.com/asini/asini/pull/33) Use default text color for `logger.info` output. ([@gigabo](https://github.com/gigabo))

#### Commiters: 3
- Bo Borgerson ([gigabo](https://github.com/gigabo))
- Gary Johnson ([garyjN7](https://github.com/garyjN7))
- Joscha Feth ([joscha](https://github.com/joscha))


## v1.0.0 (2016-10-07)

#### Enhancement
  * [#1](https://github.com/asini/asini/pull/1) Add support for configurable package locations. ([@gigabo](https://github.com/gigabo))
  * [#5](https://github.com/asini/asini/pull/5) Make log levels more like npm. ([@gigabo](https://github.com/gigabo))
  * [#8](https://github.com/asini/asini/pull/8) Make `--scope` and `--ignore` available across commands. ([@gigabo](https://github.com/gigabo))
  * [#15](https://github.com/asini/asini/pull/15) Add an option sieve for all commands.  ([@gigabo](https://github.com/gigabo))
  * [#18](https://github.com/asini/asini/pull/18) Validate and standardize exposure of command classes.  ([@gigabo](https://github.com/gigabo))
  * [#30](https://github.com/asini/asini/pull/30) Run pre/post install scripts during bootstrap. ([@seansfkelley](https://github.com/seansfkelley))
  * [#32](https://github.com/asini/asini/pull/32) Append (private) in changes list for private packages in publish command. ([@sresant](https://github.com/sresant))

#### Bug Fix
  * [#6](https://github.com/asini/asini/pull/6) Get `logify*` methods working again. ([@gigabo](https://github.com/gigabo))
  * [#13](https://github.com/asini/asini/pull/13) Fix logging inside of init command.  ([@sresant](https://github.com/sresant))
  * [#16](https://github.com/asini/asini/pull/16) Increase maxBuffer.  ([@rygine](https://github.com/rygine))
  * [#20](https://github.com/asini/asini/pull/20) Change bootstrap command to not install peerDependencies.  ([@loklaan](https://github.com/loklaan))
  * [#28](https://github.com/asini/asini/pull/28) Various fixes for windows. ([@motiz88](https://github.com/motiz88))
  * [#29](https://github.com/asini/asini/pull/29) Fix importing commits which renamed files. ([@ryb73](https://github.com/ryb73))


#### Commiters: 7
- Bo Borgerson ([gigabo](https://github.com/gigabo))
- Lochlan Bunn ([loklaan](https://github.com/loklaan))
- Moti Zilberman ([motiz88](https://github.com/motiz88))
- Ry Racherbaumer ([rygine](https://github.com/rygine))
- Ryan Biwer ([ryb73](https://github.com/ryb73))
- Sean Kelley ([seansfkelley](https://github.com/seansfkelley))
- Sresan Thevarajah ([sresant](https://github.com/sresant))
