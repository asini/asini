# Contributing to Asini

To get started with the repo:

```sh
$ git clone git@github.com:asini/asini.git && cd asini
$ npm install
```

In order to run the tests:

```sh
$ npm test
```

Or the linter:

```sh
$ npm run lint
```

If you want to test out Asini on local repos:

```sh
$ npm run build
$ npm link
```

This will set your global `asini` command to the local version.

Note that Asini needs to be built after changes are made. So you can either run
`npm run build` to run it once, or you can run:

```sh
$ npm run dev
```

Which will start a watch task that will continuously re-build Asini while you
are working on it.
