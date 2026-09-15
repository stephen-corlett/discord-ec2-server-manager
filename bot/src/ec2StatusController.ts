import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v10';
import CommandService from './CommandService.ts';
import WorldRegistryService from './WorldRegistryService.ts';
import { ScheduledShutdown } from './types/events.ts';
import { isBotRequestEvent, isScheduledShutdown } from './helpers/eventHelper.ts';
import authorizationHelper from './helpers/authorizationHelper.ts';
import config from './ec2StatusControllerConfig.ts';

const handleLambdaEvent: Handler<APIGatewayProxyEvent | ScheduledShutdown, string> = async (event) => {
  const worldRegistry = new WorldRegistryService(config.env.SSM_WORLD_PREFIX);
  const commandService = new CommandService(config.env.BOT_APPLICATION_ID, config.env.BOT_CLIENT_SECRET, worldRegistry);

  try {
    if (isScheduledShutdown(event)) {
      await commandService.handleScheduledShutdown();
    } else if (isBotRequestEvent(event)) {
      if (!(await authorizationHelper.isAuthorized(event.headers, event.body!, config.env.BOT_PUBLIC_KEY))) {
        throw new Error('Unauthorized');
      }
      const parsedBotRequest = JSON.parse(event.body!) as APIChatInputApplicationCommandInteraction;
      await commandService.run(parsedBotRequest);
    }
    return 'success';
  } catch (e) {
    console.log(e);
    return 'failed';
  }
};

export default handleLambdaEvent;
