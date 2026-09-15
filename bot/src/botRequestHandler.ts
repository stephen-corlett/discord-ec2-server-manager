import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import {
  APIBaseInteraction,
  APIInteractionResponse,
  InteractionResponseType,
  InteractionType,
} from 'discord-api-types/v10';
import HttpStatus from 'http-status-codes';
import authorizationHelper from './helpers/authorizationHelper.ts';
import lambdaService from './lambdaService.ts';
import { InternalServerError, BadRequestError, UnauthorizedError } from './errors/index.ts';
import CommandType from './constants/CommandType.ts';
import APIResponse from './types/APIResponse.ts';
import { isDiscordApplicationCommand, isDiscordChatInputCommand, isDiscordPing } from './helpers/discordTypeHelper.ts';
import { isLambdaError } from './helpers/errorHelper.ts';
import config from './botRequestHandlerConfig.ts';

const handleInteractionType = async (event: APIGatewayProxyEvent): Promise<APIInteractionResponse> => {
  const eventBody = JSON.parse(event.body!) as APIBaseInteraction<InteractionType, unknown>;
  if (isDiscordPing(eventBody)) {
    if (!(await authorizationHelper.isAuthorized(event.headers, event.body!, config.env.BOT_PUBLIC_KEY))) {
      throw new UnauthorizedError();
    }
    return { type: InteractionResponseType.Pong };
  }

  if (isDiscordApplicationCommand(eventBody) && isDiscordChatInputCommand(eventBody)) {
    const commandType = eventBody.data.options![0].name;
    if (!Object.values(CommandType).includes(commandType)) {
      throw new BadRequestError(`CommandType ${commandType} is not supported`);
    }

    await lambdaService.invoke(config.env.RESPONSE_FUNC_ARN, event);

    return { type: InteractionResponseType.DeferredChannelMessageWithSource };
  }

  throw new InternalServerError('Unsupported interaction type.');
};

const handleLambdaEvent: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const responsePayload = await handleInteractionType(event);
    return new APIResponse<APIInteractionResponse>(HttpStatus.OK, responsePayload).toApiGatewayProxyResult();
  } catch (e) {
    const errorPayload = isLambdaError(e) ? e : new InternalServerError();
    return new APIResponse(errorPayload.statusCode, { message: errorPayload.message }).toApiGatewayProxyResult();
  }
};

export default handleLambdaEvent;
