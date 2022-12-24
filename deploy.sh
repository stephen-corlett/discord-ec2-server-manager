#!/usr/bin/env bash

echo Cleaning up old build files...
rm -rf build
rm -rf dependencies

echo Preparing to build...

echo Building...
npm install
npm run lint
npm run compile

mkdir -p ./dependencies/nodejs/
cp package.json ./dependencies/nodejs/package.json
# cp -r node_modules ../dependencies/nodejs/node_modules
cd dependencies/nodejs
npm install --production

cd ../../

sam deploy
