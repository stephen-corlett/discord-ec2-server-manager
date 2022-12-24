import { APIGatewayProxyHandler } from 'aws-lambda';
import { APIInteractionResponse, InteractionResponseType } from 'discord-api-types/v9';
import HttpStatus from 'http-status-codes';
import authorizationHelper from './helpers/authorizationHelper';
import lambdaService from './lambdaService';
import { InternalServerError, BadRequestError } from './errors';
import CommandType from './constants/CommandType';
import APIResponse, { IAPIResponse } from './types/APIResponse';
import { isDiscordApplicationCommand, isDiscordChatInputCommand, isDiscordPing } from './helpers/discordTypeHelper';
import { isLambdaError } from './helpers/errorHelper';

const handleInteractionType = async (body: unknown): Promise<APIInteractionResponse> => {
  if (isDiscordPing(body)) {
    return { type: InteractionResponseType.Pong };
  }

  if (isDiscordApplicationCommand(body) && isDiscordChatInputCommand(body)) {
    const commandType = body.data.options[0].name;
    if (!Object.values(CommandType).includes(commandType)) {
      throw new BadRequestError(`CommandType ${commandType} is not supported`);
    }

    await lambdaService.invoke(body);
    return { type: InteractionResponseType.DeferredChannelMessageWithSource };
  }

  throw new InternalServerError('Unsupported interaction type.');
};

const handleLambdaEvent: APIGatewayProxyHandler = async (event) => {
  let response: IAPIResponse;
  try {
    authorizationHelper.verifyAuthorization(event.headers, event.body);

    const eventBody = JSON.parse(event.body) as unknown;
    const responsePayload = await handleInteractionType(eventBody);
    response = new APIResponse<APIInteractionResponse>(HttpStatus.OK, responsePayload);
  } catch (e) {
    const errorPayload = isLambdaError(e) ? e : new InternalServerError();
    response = new APIResponse(errorPayload.statusCode, { message: errorPayload.message });
  }
  console.log(response);
  return response.toApiGatewayProxyResult();
};

export default handleLambdaEvent;
