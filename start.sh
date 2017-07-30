#!/bin/bash
#
# Starts up a mongo container, then starts the UpStaging API server linked to mongo
#
# Usage: ./start.sh
set -e
docker start mongo || docker run -it -d --net=host -p 27017:27017 --name=mongo --restart=Always mongo || exit 1
docker start flask || docker run -it -d --link=mongo --name=flask --restart=Always -p 8080:8080 upstaging/apiserver
