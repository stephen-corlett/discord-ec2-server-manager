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
cd dependencies/nodejs
npm install --production

cd ../../

source .env
sam deploy --config-file samconfig.toml \
  --parameter-overrides \
    ParameterKey=AwsRegion,ParameterValue=$AWS_REGION \
    ParameterKey=BotApplicationId,ParameterValue=$BOT_APPLICATION_ID \
    ParameterKey=BotPublicKey,ParameterValue=$BOT_PUBLIC_KEY \
    ParameterKey=BotClientSecret,ParameterValue=$BOT_CLIENT_SECRET \
    ParameterKey=EC2InstanceId,ParameterValue=$EC2_INSTANCE_ID
