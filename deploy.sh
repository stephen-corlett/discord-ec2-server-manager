#!/usr/bin/env bash

echo Cleaning up old build files...
rm -rf build
rm -rf dependencies

echo Preparing to build...

echo Building...
npm install
npm run lint
npm run build:botRequestHandler
npm run build:ec2StatusController

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
    ParameterKey=S3BucketName,ParameterValue=$S3_BUCKET_NAME \
    ParameterKey=S3StartServerScriptPath,ParameterValue=$S3_START_SERVER_SCRIPT_PATH \
    ParameterKey=EC2InstanceType,ParameterValue=$EC2_INSTANCE_TYPE \
    ParameterKey=EC2ImageId,ParameterValue=$EC2_IMAGE_ID \
    ParameterKey=EBSStorageSizeGB,ParameterValue=$EBS_STORAGE_SIZE_GB \
    ParameterKey=ServerUrl,ParameterValue=$SERVER_URL
