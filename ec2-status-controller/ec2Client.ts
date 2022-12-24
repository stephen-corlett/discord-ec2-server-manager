import * as AWS from 'aws-sdk';
import config from './config';

AWS.config.update({
  // accessKeyId: config.env.ACCESS_KEY,
  // secretAccessKey: config.env.SECRET_KEY,
  region: config.env.REGION,
});

const ec2 = new AWS.EC2({ apiVersion: '2016-11-15' });

export default ec2;
