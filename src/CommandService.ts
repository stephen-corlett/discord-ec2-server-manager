import EC2Service from './ec2Service';
import DiscordClient from './DiscordClient';
import { InstanceState, CommandType, DiscordEmoji } from './constants';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/payloads/v9';

interface ICommandService {
  run: (command: APIChatInputApplicationCommandInteraction, ec2InstanceId: string) => Promise<void>;
}

class CommandService implements ICommandService {
  private discordClient: DiscordClient;

  constructor(botApplicationId: string, botApplicationSecret: string, private ec2Service = new EC2Service()) {
    this.discordClient = new DiscordClient(botApplicationId, botApplicationSecret);
  }

  public run = async (command: APIChatInputApplicationCommandInteraction, ec2InstanceId: string): Promise<void> => {
    try {
      const message = await this.getMessageResponse(command, ec2InstanceId);
      await this.discordClient.sendDiscordResponse(command, message);
    } catch (e) {
      console.log(e);
      const unhandledErrorDiscordMessage = `${DiscordEmoji.SOS} Something went wrong, you might want to try again.`;
      await this.discordClient.sendDiscordResponse(command, unhandledErrorDiscordMessage);
      throw new Error('Error completing request.');
    }
  };

  private getMessageResponse = (command: APIChatInputApplicationCommandInteraction, ec2InstanceId: string) => {
    const commandType = command.data.options[0].name;
    switch (commandType) {
      case CommandType.START:
        return this.handleStart(ec2InstanceId);
      case CommandType.STOP:
        return this.handleStop(ec2InstanceId);
      case CommandType.STATUS:
        return this.handleStatus(ec2InstanceId);
      default:
        throw new Error('Unsupported command type.');
    }
  };

  private getInstanceInfo = async (instanceId: string) => {
    const {
      State: { Name: state },
      PublicIpAddress: ipAddress,
    } = await this.ec2Service.describeInstance(instanceId);
    return { state, ipAddress };
  };

  private handleStart = async (instanceId: string) => {
    const { state, ipAddress } = await this.getInstanceInfo(instanceId);
    if (state === InstanceState.RUNNING) {
      return `${DiscordEmoji.AXE} Server is already running at IP: ${ipAddress}`;
    }

    await this.ec2Service.startInstance(instanceId);
    await this.ec2Service.waitForInstanceRunning(instanceId);
    const { ipAddress: newIp } = await this.getInstanceInfo(instanceId);

    return `${DiscordEmoji.CROSSED_SWORDS} Server started at IP: ${newIp}`;
  };

  handleStop = async (instanceId: string): Promise<string> => {
    if ((await this.getInstanceInfo(instanceId)).state === InstanceState.STOPPED) {
      return `${DiscordEmoji.BED} Server is already stopped`;
    }

    await this.ec2Service.stopInstance(instanceId);

    return `${DiscordEmoji.HALF_MOON_LEFT} Stopping the server`;
  };

  private handleStatus = async (instanceId: string) => {
    const { state, ipAddress } = await this.getInstanceInfo(instanceId);

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
}

export default CommandService;
