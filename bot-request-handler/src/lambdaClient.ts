import * as AWS from 'aws-sdk';
import config from './config';

AWS.config.update({
  region: config.env.REGION,
});

const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

export default lambda;
