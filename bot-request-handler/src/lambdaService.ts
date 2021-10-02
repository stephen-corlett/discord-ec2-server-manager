import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v9';

import Errors from './errors';
import lambdaClient from './lambdaClient';
import config from './config';

const { InternalServerError } = Errors;

const invoke = async (payload: APIChatInputApplicationCommandInteraction) => {
  const lambdaInfo = {
    FunctionName: config.env.RESPONSE_FUNC_ARN,
    InvocationType: 'Event',
    Payload: JSON.stringify(payload),
  };

  try {
    await lambdaClient.invoke(lambdaInfo).promise();
  } catch (e) {
    throw new InternalServerError('Failed to execute response lambda.');
  }
};

export default {
  invoke,
};
