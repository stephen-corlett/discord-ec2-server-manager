#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/bot"

echo "Cleaning up old build files..."
rm -rf build
rm -rf dependencies

echo "Building..."
npm install
npm run lint
npm run build:botRequestHandler
npm run build:ec2StatusController

echo '{"type":"module"}' > ./build/bot-request-handler/package.json
echo '{"type":"module"}' > ./build/ec2-status-controller/package.json

mkdir -p ./dependencies/nodejs/
cp package.json ./dependencies/nodejs/package.json
cd dependencies/nodejs
npm install --production

cd ../../

echo "Deploying bot stack..."
sam deploy --config-file samconfig.toml
