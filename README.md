# Omniboard

[![Build Status](https://travis-ci.com/vivekratnavel/omniboard.svg?branch=master)](https://travis-ci.com/vivekratnavel/omniboard)
[![Coverage Status](https://coveralls.io/repos/github/vivekratnavel/omniboard/badge.svg?branch=master&service=github)](https://coveralls.io/github/vivekratnavel/omniboard?branch=master)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/) [![Greenkeeper badge](https://badges.greenkeeper.io/vivekratnavel/omniboard.svg)](https://greenkeeper.io/)

Omniboard is a web dashboard for the [Sacred](https://github.com/IDSIA/sacred)
machine learning experiment management tool.

It connects to the MongoDB database used by Sacred
and helps in visualizing the experiments and metrics / logs collected in each experiment.

Omniboard is written with React, Node.js, Express and Bootstrap

# Features

## Experiment Management
* List all experiment runs in a tabular format with columns that are sortable, reorderable and resizable
* Select which columns to show / hide 
* Add metric columns to display rolled up metric value (e.g., minimum validation loss, maximum training accuracy, etc.)
* Add tags or notes to each experiment to organize and guide your experiments 
* Filter by tags or status

## Experiment Drill Down
* Show metric graphs
* Show console output
* Show all runtime library dependencies
* View or download source files
* View or download artifacts
* Show hardware spec of the host (e.g., OS version, CPU / GPU device info, driver versions)
* Show git hash/version control info

# Screenshots

![Experiments Table](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/screenshots/table.png)
![Metrics Graphs](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/screenshots/metric-graphs.png)
![Adding Metrics Columns](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/screenshots/adding-metrics.png)
![Console](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/screenshots/console.png)
![Experiment Details](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/screenshots/experiment-details.png)
![Host Info](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/screenshots/host-info.png)
![Source Files Viewer](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/screenshots/source-file-view.png)


# Installation

### Usage (npm) ###

_Omniboard_ requires [Node.js](https://nodejs.org/en/download/) v8 or higher.
##### To install: #####

```npm
npm install -g omniboard
```

##### To run: #####
Start omniboard with MongoDB connection string in the format `-m hostname:port:database`.
The default connection options are `localhost:27017:sacred`.  
```
omniboard -m hostname:port:database
```
For setting more advanced connection properties, use the `--mu` option together with the Sacred database name ("sacred" in the example):

```
omniboard --mu mongodb://user:pwd@host/admin?authMechanism=SCRAM-SHA-1 sacred
```

Go to http://localhost:9000 to access omniboard.

### Usage (docker) ###

Install [docker](https://www.docker.com/get-started) if not already installed.

```docker
# To start a container with omniboard
docker run -it --rm -p 9000:9000 --name omniboard vivekratnavel/omniboard -m <host>:<port>:<database>
```

To connect with mongodb that runs in another docker container:
```docker
docker run -it --rm -p 9000:9000 --name omniboard --link YOUR_MONGODB_CONTAINER:mongo vivekratnavel/omniboard -m mongo:27017:sacred
```

##### To build docker image from source #####
```
cd omniboard
npm install
# To build docker image from source
docker build -f Dockerfile -t omniboard .
# To start a container with omniboard
docker run -it --rm -p 9000:9000 --name omniboard omniboard -m <host>:<port>:<database>
```

Go to http://localhost:9000 to access omniboard. To debug, use `docker logs <OMNIBOARD_CONTAINER>`

### Usage (source) ###

To get the latest features, install from source
```
# clone the repository and cd into omniboard
npm install
npm run prod
```
For advanced MongoDB connection options, refer to npm usage.

# Development

Install dependencies and start dev server

```npm
yarn install
yarn run dev
```
This should start both server and web. Go to http://localhost:3000 to access omniboard.

This project uses [commitizen](https://github.com/commitizen/cz-cli) for commit messages. To commit changes, run
```npm
yarn run cm
```


About Omniboard
-------

Lead Developer: [Vivek Ratnavel Subramanian](https://github.com/vivekratnavel)

Project Advisor: [Yusaku Sako](https://github.com/u39kun)

Omniboard was conceived while Yusaku was working on Kaggle competitions and could not find suitable open source software for easily managing hundreds of experiments to iterate on models quickly.  Omniboard takes inspiration from [Sacredboard](https://github.com/chovanecm/sacredboard).  [See blog](https://medium.com/@u39kun/managing-your-machine-learning-experiments-and-making-them-repeatable-in-tensorflow-pytorch-bc8043099dbd) on how this project got started.

License
-------
MIT License

Copyright (c) 2018 Vivek Ratnavel Subramanian

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
