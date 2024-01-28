import { Handler } from 'aws-lambda';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/v9';
import CommandService from './CommandService';

const handleLambdaEvent: Handler<APIChatInputApplicationCommandInteraction, string> = async (event) => {
  const commandService = new CommandService();
  try {
    await commandService.run(event);
    return 'success';
  } catch (e) {
    console.log(e);
    return 'failed';
  }
};

export default handleLambdaEvent;
