import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v9';
import CommandService from './CommandService';
import { ScheduledShutdown } from './types/events';
import { isBotRequestEvent, isScheduledShutdown } from './helpers/eventHelper';
import authorizationHelper from './helpers/authorizationHelper';
import config from './ec2StatusControllerConfig';

const handleLambdaEvent: Handler<APIGatewayProxyEvent | ScheduledShutdown, string> = async (event) => {
  const commandService = new CommandService(config.env.BOT_APPLICATION_ID, config.env.BOT_CLIENT_SECRET);

  try {
    if (isScheduledShutdown(event)) {
      await commandService.handleStop(config.env.INSTANCE_ID);
    } else if (isBotRequestEvent(event)) {
      if (!authorizationHelper.isAuthorized(event.headers, event.body, config.env.BOT_PUBLIC_KEY)) {
        throw new Error('Una');
      }
      const parsedBotRequest = JSON.parse(event.body) as APIChatInputApplicationCommandInteraction;
      await commandService.run(parsedBotRequest, config.env.INSTANCE_ID);
    }
    return 'success';
  } catch (e) {
    console.log(e);
    return 'failed';
  }
};

export default handleLambdaEvent;
