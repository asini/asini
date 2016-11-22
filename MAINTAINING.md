# Asini Maintainers Handbook

## The Asini Repo

This repository is itself an Asini repo.  In order to avoid cycles in the
dependency graph the repo root does not depend on itself, so `asini` and
`asini-changelog` must be installed globally.

```bash
npm i -g .
npm i -g packages/asini-changelog
```

## How to Publish

1. `git checkout master && git pull --rebase`
1. `asini clean && asini bootstrap`
1. `asini-changelog >> CHANGELOG.md`
1. Hand-edit `CHANGELOG.md` to move changes to top and set version
1. `git add CHANGELOG.md`
1. `asini publish`
1. Copy and paste changelog entry into tag notes on GitHub
1. Link to GitHub tag notes from
   [`#announcements`](https://asini.slack.com/messages/announcements) on slack
