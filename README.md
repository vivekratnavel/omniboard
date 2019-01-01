# Omniboard

[![npm version](https://img.shields.io/npm/v/omniboard.svg)](https://www.npmjs.com/package/omniboard)
[![Build Status](https://travis-ci.com/vivekratnavel/omniboard.svg?branch=master)](https://travis-ci.com/vivekratnavel/omniboard)
[![Coverage Status](https://img.shields.io/coveralls/github/vivekratnavel/omniboard/master.svg)](https://coveralls.io/github/vivekratnavel/omniboard?branch=master)
[![docker build](https://img.shields.io/docker/build/vivekratnavel/omniboard.svg)](https://hub.docker.com/r/vivekratnavel/omniboard/builds)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Omniboard is a web dashboard for the [Sacred](https://github.com/IDSIA/sacred)
machine learning experiment management tool.

It connects to the MongoDB database used by Sacred
and helps in visualizing the experiments and metrics / logs collected in each experiment.

Omniboard is written with React, Node.js, Express and Bootstrap

## Features

### Experiment Management
* List all experiment runs in a tabular format with columns that are sortable, reorderable and resizable
* Select which columns to show / hide 
* Add metric columns to display rolled up metric value (e.g., minimum validation loss, maximum training accuracy, etc.)
* Add tags or notes to each experiment to organize and guide your experiments 
* Filter by all columns except metric columns

### Experiment Drill Down
* Show metric graphs
* Show console output
* Show all runtime library dependencies
* View or download source files
* View or download artifacts
* Show hardware spec of the host (e.g., OS version, CPU / GPU device info, driver versions)
* Show git hash/version control info

## Screenshots

![Experiments Table](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/table.png)
![Metrics Graphs](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/metric-graphs.png)
![Adding Metrics Columns](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/adding-metrics.png)
![Console](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/console.png)
![Experiment Details](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/experiment-details.png)
![Host Info](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/host-info.png)
![Source Files Viewer](https://raw.githubusercontent.com/vivekratnavel/omniboard/master/docs/assets/screenshots/source-file-view.png)

## Getting Started

Check out the [Quick Start](https://vivekratnavel.github.io/omniboard/#/quick-start) documentation to get started.


## About Omniboard

Lead Developer: [Vivek Ratnavel Subramanian](https://github.com/vivekratnavel)

Project Advisor: [Yusaku Sako](https://github.com/u39kun)

Omniboard was conceived while Yusaku was working on Kaggle competitions and could not find suitable open source software for easily managing hundreds of experiments to iterate on models quickly. Omniboard takes inspiration from [Sacredboard](https://github.com/chovanecm/sacredboard).  [See blog](https://medium.com/@u39kun/managing-your-machine-learning-experiments-and-making-them-repeatable-in-tensorflow-pytorch-bc8043099dbd) on how this project got started.

## License

MIT License

Copyright (c) 2018 Vivek Ratnavel Subramanian

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
