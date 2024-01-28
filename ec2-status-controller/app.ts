import { Handler } from 'aws-lambda';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v9';
import CommandService from './CommandService';

type ScheduledShutdown = { isScheduledShutdown: boolean };

const handleLambdaEvent: Handler<APIChatInputApplicationCommandInteraction | ScheduledShutdown, string> = async (
  event
) => {
  const commandService = new CommandService();

  try {
    if ((event as ScheduledShutdown)?.isScheduledShutdown) {
      await commandService.handleStop();
    } else {
      await commandService.run(event as APIChatInputApplicationCommandInteraction);
    }
    return 'success';
  } catch (e) {
    console.log(e);
    return 'failed';
  }
};

export default handleLambdaEvent;
