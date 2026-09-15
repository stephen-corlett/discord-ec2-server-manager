import { EC2Client } from '@aws-sdk/client-ec2';

const ec2Client = new EC2Client({ region: process.env.REGION });

export default ec2Client;
