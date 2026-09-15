import EC2Service from './ec2Service.ts';
import DiscordClient from './DiscordClient.ts';
import WorldRegistryService from './WorldRegistryService.ts';
import { InstanceState, CommandType, DiscordEmoji } from './constants/index.ts';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/payloads/v10';
import { WorldConfig } from './types/WorldConfig.ts';

class CommandService {
  private discordClient: DiscordClient;

  constructor(
    botApplicationId: string,
    botApplicationSecret: string,
    private worldRegistry: WorldRegistryService,
    private ec2Service = new EC2Service()
  ) {
    this.discordClient = new DiscordClient(botApplicationId, botApplicationSecret);
  }

  public run = async (command: APIChatInputApplicationCommandInteraction): Promise<void> => {
    try {
      const message = await this.getMessageResponse(command);
      await this.discordClient.sendDiscordResponse(command, message);
    } catch (e) {
      console.log(e);
      const unhandledErrorDiscordMessage = `${DiscordEmoji.SOS} Something went wrong, you might want to try again.`;
      await this.discordClient.sendDiscordResponse(command, unhandledErrorDiscordMessage);
      throw new Error('Error completing request.');
    }
  };

  private getMessageResponse = (command: APIChatInputApplicationCommandInteraction) => {
    const subcommand = command.data.options![0];
    const commandType = subcommand.name;
    const worldOption =
      'options' in subcommand && subcommand.options && subcommand.options.length > 0
        ? String((subcommand.options[0] as { value: unknown }).value)
        : undefined;

    switch (commandType) {
      case CommandType.START:
        if (!worldOption) return Promise.resolve(`${DiscordEmoji.X} You must specify a world name.`);
        return this.handleStart(worldOption);
      case CommandType.STOP:
        if (!worldOption) return Promise.resolve(`${DiscordEmoji.X} You must specify a world name.`);
        return this.handleStop(worldOption);
      case CommandType.STATUS:
        return worldOption ? this.handleStatus(worldOption) : this.handleStatusAll();
      default:
        throw new Error('Unsupported command type.');
    }
  };

  private getInstanceInfo = async (instanceId: string) => {
    const instance = await this.ec2Service.describeInstance(instanceId);
    const state = instance.State?.Name;
    const ipAddress = instance.PublicIpAddress;
    return { state, ipAddress };
  };

  private handleStart = async (worldId: string) => {
    const world = await this.worldRegistry.getWorld(worldId);
    const name = this.formatDisplayName(world);
    const { state } = await this.getInstanceInfo(world.instanceId);

    if (state === InstanceState.RUNNING) {
      return `${DiscordEmoji.AXE} **${name}** is already running at: ${world.serverUrl}`;
    }

    await this.ec2Service.startInstance(world.instanceId);
    await this.ec2Service.waitForInstanceRunning(world.instanceId);

    return `${DiscordEmoji.CROSSED_SWORDS} **${name}** started at: ${world.serverUrl}`;
  };

  handleStop = async (worldId: string): Promise<string> => {
    const world = await this.worldRegistry.getWorld(worldId);
    const name = this.formatDisplayName(world);
    const { state } = await this.getInstanceInfo(world.instanceId);

    if (state === InstanceState.STOPPED) {
      return `${DiscordEmoji.BED} **${name}** is already stopped`;
    }

    await this.ec2Service.stopInstance(world.instanceId);
    return `${DiscordEmoji.HALF_MOON_LEFT} Stopping **${name}**`;
  };

  private handleStatus = async (worldId: string) => {
    const world = await this.worldRegistry.getWorld(worldId);
    return this.formatWorldStatus(world);
  };

  private handleStatusAll = async () => {
    const worlds = await this.worldRegistry.listWorlds();

    if (worlds.length === 0) {
      return `${DiscordEmoji.SLEEPING} No game worlds registered`;
    }

    const lines = await Promise.all(worlds.map((w) => this.formatWorldStatus(w)));
    return lines.join('\n');
  };

  handleScheduledShutdown = async (): Promise<void> => {
    const worlds = await this.worldRegistry.listWorlds();

    for (const world of worlds) {
      try {
        const { state } = await this.getInstanceInfo(world.instanceId);
        if (state === InstanceState.RUNNING) {
          await this.ec2Service.stopInstance(world.instanceId);
          console.log(`Scheduled shutdown: stopped ${world.worldId}`);
        }
      } catch (e) {
        console.log(`Scheduled shutdown: failed to stop ${world.worldId}`, e);
      }
    }
  };

  private formatDisplayName = (world: WorldConfig) => {
    const titleCase = (s: string) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${titleCase(world.gameName)}: ${world.serverName}`;
  };

  private formatWorldStatus = async (world: WorldConfig) => {
    const { state } = await this.getInstanceInfo(world.instanceId);
    const name = this.formatDisplayName(world);
    const label = `**${name}** (World ID: \`${world.worldId}\`)`;

    if (state === InstanceState.RUNNING) {
      return `${DiscordEmoji.TREE} ${label} - running at: \`${world.serverUrl}\``;
    } else if (state === InstanceState.STOPPED) {
      return `${DiscordEmoji.SLEEPING} ${label} stopped`;
    } else if (state === InstanceState.STOPPING) {
      return `${DiscordEmoji.HALF_MOON_RIGHT} ${label} stopping`;
    } else {
      return `${DiscordEmoji.HOURGLASS} ${label} pending`;
    }
  };
}

export default CommandService;
