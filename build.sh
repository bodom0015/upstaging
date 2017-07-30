#!/bin/bash

# Build up mongo db image form db backup (optional)
#docker build -t upstaging/mongo -f Dockerfile.mongo .

# Build Android APK
#ionic cordova build android --release --prod

# Build production browser code
#ionic cordova build browser --release --prod

docker build -t upstaging/apiserver -f Dockerfile.apiserver .
