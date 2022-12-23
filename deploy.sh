#!/usr/bin/env bash

rm -rf build/*
rm -rf tmp/*
rm -rf dependencies/*
cp -r bot-request-handler/* tmp
cd tmp
npm install
npm run lint
npm run compile

npm prune --production
mkdir ../dependencies/nodejs/
cp -r node_modules ../dependencies/nodejs/node_modules

cd ..

sam deploy
