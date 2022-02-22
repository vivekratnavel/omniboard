# Quick Start

## Installation

### NPM

> Note: Omniboard requires [Node.js](https://nodejs.org/en/download/) v12 or higher installed in your system.

##### Install: #####

```bash
npm install -g omniboard
```

This will install the latest version of Omniboard globally. To install a specific version, use `npm install -g omniboard@0.3.0`. Replace `0.3.0` with the version number you want to install.  

##### Start: #####
 
```bash
omniboard -m hostname:port:database
```

Replace `hostname`, `port` and `database` to connect with a running MongoDB instance where `sacred` data is stored.
The default connection options are `localhost:27017:sacred`. 

For setting more advanced connection properties, use the `--mu` option together with a [MongoDB connection URI](https://docs.mongodb.com/manual/reference/connection-string/):

```bash
omniboard --mu "mongodb://<username>:<password>@<host>/<database>[?options]"
```

For instance, to connect with a running instance on the cloud service [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), where the data is stored on the database `sacred`, you would use a command in the following form:

```bash
omniboard --mu "mongodb+srv://my-username:my-password@my-cluster-v9zjk.mongodb.net/sacred?retryWrites=true"
```

To connect to multiple sacred databases, create a database configuration file, such as:
```json
{
    "db1": {
      "mongodbURI": "mongodb://my-username:my-password@my-cluster/sacred_db1",
      "path": "/db1",
      "runsCollectionName": "runs", // optional
      "metricsCollectionName": "metrics" // optional
    },
    "db2": {
      "mongodbURI": "mongodb://my-username:my-password@my-cluster/sacred_db2",
      "path": "/db2",
      "runsCollectionName": "runs", // optional
      "metricsCollectionName": "metrics" // optional
    }
}
```
Set the environment variable `OMNIBOARD_CONFIG=/path/to/database_config.json` before running omniboard.

Then access the databases at `localhost:9000/db1` and `localhost:9000/db2`. You can configure these paths with the `path` entry in the config above.

For basic authentication, start omniboard with the `-u` option:

```bash
omniboard -m hostname:port:database -u username:password:secret
```

Replace `username`, `password` and `secret` with your desired authentication information.

Go to http://localhost:9000 to access omniboard.

### Docker

Install [docker](https://www.docker.com/get-started) if not already installed.

```bash
# To start a container with omniboard
docker run -it --rm -p 9000:9000 --name omniboard vivekratnavel/omniboard -m <host>:<port>:<database>
```

To connect with mongodb that runs in another docker container:
```bash
# create a new docker network or use an existing network
docker network create omniboard-network
# make sure that mongodb container is using the same docker network before running this command
docker run -it --rm -p 9000:9000 --name omniboard --net=omniboard-network vivekratnavel/omniboard -m MONGODB_CONTAINER:27017:sacred
# or use the MONGO_URI environment variable
docker run -it --rm -p 9000:9000 --name omniboard -e MONGO_URI=<mongo_uri> --net=omniboard-network vivekratnavel/omniboard 
```

Go to http://localhost:9000 to access omniboard. To debug, use `docker logs <OMNIBOARD_CONTAINER>`

### Docker Compose
To start omniboard together with a password protected mongoDB using `docker-compose`, you can use the following
`docker-compose.yml` as a template

```yaml
version: '3'
services:

  mongo:
    image: mongo
    ports:
      - 127.0.0.1:27017:27017
    environment:
      MONGO_INITDB_ROOT_USERNAME: sample
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: db
    expose:
      - 27017
    networks:
      - omniboard

  omniboard:
    image: vivekratnavel/omniboard:latest
    command: ["--mu", "mongodb://sample:password@mongo:27017/db?authSource=admin"]
    ports:
      - 127.0.0.1:9000:9000
    networks:
      - omniboard
    depends_on:
      - mongo

networks:
  omniboard:
```
In the same directory as the `docker-compose.yml` file run

```bash
docker-compose up
```

This will start both containers bound to the localhost IP address. The important part
here is to set the `authSource=admin` parameter, as the root user is created in the 
admin database and not in the database that we are connecting omniboard to.

In your sacred code you can then create a MongoObserver like so
```python
MongoObserver.create(url=f'mongodb://sample:password@localhost:27017/?authMechanism=SCRAM-SHA-1',
                     db_name='db'))
```

For production settings you should of course opt for a more secure password.

## How it works

### Table View

Omniboard automatically expands config parameters upto one level as individual columns.
It also adds two new columns `Tags` and `Notes` whose values are stored under the key
`omniboard` in `runs` collection of Mongodb.

### Cache

When users make any changes to columns such as hiding or resizing or re-ordering a column,
those changes are saved in the browsers local storage. This enables Omniboard to 
remember these settings when the page is reloaded or reopened later.
Check out the [Troubleshooting Guide](https://vivekratnavel.github.io/omniboard/#/troubleshooting?id=reset-cache) for documentation on how to reset cache.

### Metric Columns

The metadata of newly created metric columns are stored in a new collection
`omniboard.metric.columns` in Mongodb. 

### Custom Columns

The metadata of newly added custom columns are stored in a new collection
`omniboard.custom.columns` in Mongodb.
