# Development

Omniboard has two components - `server` and `web`. The server is built with 
Nodejs and Express while web is built with React and Bootstrap.

Omniboard uses [yarn](https://yarnpkg.com/en/) package manager to manage dependencies.
Install [yarn](https://yarnpkg.com/en/docs/install) if not already installed and
then run the following commands to start both server and web in dev mode 

```bash
yarn install
yarn run dev
```
Go to http://localhost:3000/sacred to access omniboard.

## Unit tests

Unit tests are written with `Jest` and `Enzyme`. 

To run unit tests:
```bash
cd web
yarn run test
```

## Committing code 

Omniboard uses [commitizen](https://github.com/commitizen/cz-cli) for commit messages. To commit changes, run
```bash
yarn run cm
```
