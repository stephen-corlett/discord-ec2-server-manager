import ec2Client from './ec2Client';
import DiscordClient from './DiscordClient';
import { InstanceState, CommandType, DiscordEmoji } from './constants';
import config from './config';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/payloads/v9';

const InstanceParams = {
  InstanceIds: [config.env.INSTANCE_ID],
};

interface ICommandService {
  command: APIChatInputApplicationCommandInteraction;
  run: () => Promise<void>;
}

class CommandService implements ICommandService {
  constructor(public command: APIChatInputApplicationCommandInteraction) {}

  public run = async (): Promise<void> => {
    try {
      const message = await this.getMessageResponse();
      await DiscordClient.sendDiscordResponse(this.command, message);
    } catch (e) {
      console.log(e);
      throw new Error('Error completing request.');
    }
  };

  private getMessageResponse = () => {
    const commandType = this.command.data.options[0].name;
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

    const res = await this.waitForInstanceStopped();
    if (res instanceof Error) {
      return `${DiscordEmoji.X} Failed to stop the server, please retry`;
    }

    return `${DiscordEmoji.HALF_MOON_LEFT} Server stopped`;
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

  private waitForInstanceStopped = async () => {
    return await ec2Client.waitFor('instanceStopped', this.waitForInstanceParams()).promise();
  };

  private waitForInstanceParams = () => {
    return { ...InstanceParams, $waiter: { delay: 5, maxAttempts: 10 } };
  };
}

export default CommandService;
