import { SSMClient } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: process.env.REGION });

export default ssmClient;
