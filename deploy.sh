#!/usr/bin/env bash

echo Cleaning up old build files...
rm -rf build/*
rm -rf tmp/*
rm -rf dependencies/*

echo Preparing to build...
cp -r bot-request-handler/* tmp
cd tmp

echo Building...
npm install
npm run lint
npm run compile

npm prune --production
mkdir ../dependencies/nodejs/
cp -r node_modules ../dependencies/nodejs/node_modules

cd ..

sam deploy
