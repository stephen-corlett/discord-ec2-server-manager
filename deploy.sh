#!/usr/bin/env bash

cd bot-request-handler
rm -rf build/*
npm install
npm run lint
npm run compile
npm prune --production
cp -r node_modules build/node_modules
cd ..

sam deploy