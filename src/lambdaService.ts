import { InvokeCommand } from '@aws-sdk/client-lambda';
import { InternalServerError } from './errors';
import lambdaClient from './lambdaClient';
import { APIGatewayProxyEvent } from 'aws-lambda';

const invoke = async (functionArn: string, payload: APIGatewayProxyEvent): Promise<void> => {
  const command = new InvokeCommand({
    FunctionName: functionArn,
    InvocationType: 'Event',
    Payload: JSON.stringify(payload),
  });

  try {
    await lambdaClient.send(command);
  } catch (e) {
    throw new InternalServerError('Failed to execute response lambda.');
  }
};

export default {
  invoke,
};
