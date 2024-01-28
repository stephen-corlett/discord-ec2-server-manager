import ec2Client from './ec2Client';
import DiscordClient from './DiscordClient';
import { InstanceState, CommandType, DiscordEmoji } from './constants';
import config from './config';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/payloads/v9';

const InstanceParams = {
  InstanceIds: [config.env.INSTANCE_ID],
};

interface ICommandService {
  run: (command: APIChatInputApplicationCommandInteraction) => Promise<void>;
}

class CommandService implements ICommandService {
  public run = async (command: APIChatInputApplicationCommandInteraction): Promise<void> => {
    try {
      const message = await this.getMessageResponse(command);
      await DiscordClient.sendDiscordResponse(command, message);
    } catch (e) {
      console.log(e);
      const unhandledErrorDiscordMessage = `${DiscordEmoji.SOS} Something went wrong, you might want to try again.`;
      await DiscordClient.sendDiscordResponse(command, unhandledErrorDiscordMessage);
      throw new Error('Error completing request.');
    }
  };

  private getMessageResponse = (command: APIChatInputApplicationCommandInteraction) => {
    const commandType = command.data.options[0].name;
    switch (commandType) {
      case CommandType.START:
        return this.handleStart();
      case CommandType.STOP:
        return this.handleStop();
      case CommandType.STATUS:
        return this.handleStatus();
      default:
        throw new Error('Unsupported command type.');
    }
  };

  private getInstanceInfo = async () => {
    const data = await ec2Client.describeInstances(InstanceParams).promise();
    const instance = data.Reservations[0].Instances[0];
    const {
      State: { Name: state },
      PublicIpAddress: ipAddress,
    } = instance;
    return { state, ipAddress };
  };

  private handleStart = async () => {
    const { state, ipAddress } = await this.getInstanceInfo();
    if (state === InstanceState.RUNNING) {
      return `${DiscordEmoji.AXE} Server is already running at IP: ${ipAddress}`;
    }

    await ec2Client.startInstances(InstanceParams).promise();
    await this.waitForInstanceRunning();
    const { ipAddress: newIp } = await this.getInstanceInfo();

    return `${DiscordEmoji.CROSSED_SWORDS} Server started at IP: ${newIp}`;
  };

  private handleStop = async () => {
    if ((await this.getInstanceInfo()).state === InstanceState.STOPPED) {
      return `${DiscordEmoji.BED} Server is already stopped`;
    }

    await ec2Client.stopInstances(InstanceParams).promise();

    return `${DiscordEmoji.HALF_MOON_LEFT} Stopping the server`;
  };

  private handleStatus = async () => {
    const { state, ipAddress } = await this.getInstanceInfo();

    if (state === InstanceState.RUNNING) {
      return `${DiscordEmoji.TREE} Server is running at IP: ${ipAddress}`;
    } else if (state === InstanceState.STOPPED) {
      return `${DiscordEmoji.SLEEPING} Server is stopped`;
    } else if (state === InstanceState.STOPPING) {
      return `${DiscordEmoji.HALF_MOON_RIGHT} Server is stopping`;
    } else {
      return `${DiscordEmoji.HOURGLASS} Server is pending`;
    }
  };

  private waitForInstanceRunning = async () => {
    return await ec2Client.waitFor('instanceRunning', this.waitForInstanceParams()).promise();
  };

  private waitForInstanceParams = () => {
    // The waiter time should be less than the Lambda timout eg. waiter 5sec * 10attempts = 75, Lambda timeout 80 seconds
    return { ...InstanceParams, $waiter: { delay: 5, maxAttempts: 15 } };
  };
}

export default CommandService;
