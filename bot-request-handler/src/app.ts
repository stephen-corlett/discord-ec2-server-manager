import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { InteractionResponseType } from 'discord-api-types/v9';
import HttpStatus from 'http-status-codes';
import authorizationHelper from './helpers/authorizationHelper';
import lambdaService from './lambdaService';
import { InternalServerError, BadRequestError } from './errors';
import CommandType from './constants/CommandType';
import APIResponse from './types/APIResponse';
import { isDiscordApplicationCommand, isDiscordChatInputCommand, isDiscordPing } from './helpers/discordTypeHelper';
import { isLambdaError } from './helpers/errorHelper';

const handleInteractionType = async (body: unknown) => {
  if (isDiscordPing(body)) {
    return { type: InteractionResponseType.Pong };
  }

  if (isDiscordApplicationCommand(body) && isDiscordChatInputCommand(body)) {
    const commandType = body.data.options[0].name;
    if ((Object.values(CommandType) as string[]).includes(commandType)) {
      throw new BadRequestError(`CommandType ${commandType} is not supported`);
    }

    await lambdaService.invoke(body);
    return { type: InteractionResponseType.DeferredChannelMessageWithSource };
  }

  throw new InternalServerError('Unsupported interaction type.');
};

const handleLambdaEvent = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    authorizationHelper.verifyAuthorization(event.headers, event.body);

    const eventBody = JSON.parse(event.body) as unknown;
    const responsePayload = await handleInteractionType(eventBody);
    const response = new APIResponse(HttpStatus.OK, JSON.stringify(responsePayload));
    return response.toApiGatewayResponse();
  } catch (e) {
    const errorPayload = isLambdaError(e) ? e : new InternalServerError();
    throw new Error(JSON.stringify(errorPayload));
  }
};

export default { handleLambdaEvent };
