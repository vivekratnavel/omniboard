# Omniboard

Omniboard is a web dashboard for the [Sacred](https://github.com/IDSIA/sacred)
machine learning experiment management tool.

It connects to the MongoDB database used by Sacred
and helps in visualizing the experiments and metrics / logs collected in each experiment.

Omniboard is written with React, Node.js, Express and Bootstrap

# Features

* Sort, reorder, resize columns
* Show / hide columns
* Add metric columns to display rolled up metric value
* Add tags or notes to each experiment
* Filter by tags or status 

# Installation

### Usage (npm) ###

_Omniboard_ requires [Node.js](https://nodejs.org/en/download/) v8 or higher.
##### To install: #####
From source
```
# clone the repository and cd into omniboard
npm install
```
##### To run: #####
Start omniboard with MongoDB connection string in the format `-m hostname:port:database`.
The default connection options are `localhost:27017:sacred`.  
```
npm run prod -m hostname:port:database
```
For setting more advanced connection properties, use the `--mu` option together with the Sacred database name ("sacred" in the example):

```
npm run prod --mu mongodb://user:pwd@host/admin?authMechanism=SCRAM-SHA-1 sacred
```

Go to http://localhost:9000 to access omniboard.

### Usage (docker) ###

Install [docker](https://www.docker.com/get-started) if not already installed.

```
cd <omniboard>
# To build docker image from source
docker build -f Dockerfile -t omniboard .
# To run a container
docker run -it --rm -p 9000:9000 --name omniboard omniboard -m <host>:<port>:<database>

```

To connect with mongodb that runs in another docker container:
```
docker run -it --rm -p 9000:9000 --name omniboard --link YOUR_MONGODB_CONTAINER:mongo omniboard -m mongo:27017:sacred

```

Go to http://localhost:9000 to access omniboard. To debug, use `docker logs <OMNIBOARD_CONTAINER>`
 

# Development

Install dependencies and start dev server

```npm
yarn install
yarn run dev
```
This should start both server and web. Go to http://localhost:3000 to access omniboard.

License
-------
MIT License

Copyright (c) 2018 Vivek Ratnavel Subramanian

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.