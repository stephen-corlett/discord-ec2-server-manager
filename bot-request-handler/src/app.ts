import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  APIInteraction,
  APIChatInputApplicationCommandInteraction,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v9';
import HttpStatus from 'http-status-codes';

import authorizationHelper from './authorizationHelper';
import lambdaService from './lambdaService';
import Errors from './errors';
import { SupportedCommands } from './types/CommandType';
import APIResponse from './types/APIResponse';

const { InternalServerError, BadRequestError } = Errors;

const interactionHandler = (type: InteractionType): Function => {
  if (type === InteractionType.Ping) {
    return () => ({ type: InteractionResponseType.Pong });
  }

  if (type === InteractionType.ApplicationCommand) {
    return async (body: APIChatInputApplicationCommandInteraction) => {
      const commandType = <SupportedCommands>body.data.options[0].name;
      if (!commandType) {
        throw new BadRequestError(`CommandType ${commandType} is not supported`);
      }

      await lambdaService.invoke(body);
      return {
        type: InteractionResponseType.DeferredChannelMessageWithSource,
      };
    };
  }

  return () => { throw new InternalServerError('Unsupported interaction type.'); };
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    authorizationHelper.verifyAuthorization(event.headers, event.body);

    const eventBody: APIInteraction = JSON.parse(event.body);
    const handler = interactionHandler(eventBody.type);
    const response: APIResponse = {
      statusCode: HttpStatus.OK,
      body: JSON.stringify(await handler(eventBody)),
    };
    return response;
  } catch (e) {
    throw new Error(JSON.stringify({ statusCode: e.statusCode || HttpStatus.INTERNAL_SERVER_ERROR, message: e.message || 'Internal Server Error' }));
  }
};

export default { lambdaHandler };
