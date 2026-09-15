import { GetParametersByPathCommand, Parameter } from '@aws-sdk/client-ssm';
import ssmClient from './ssmClient.ts';
import { WorldConfig } from './types/WorldConfig.ts';

class WorldRegistryService {
  constructor(private prefix: string) {}

  async listWorlds(): Promise<WorldConfig[]> {
    const params = await this.fetchAllParameters(this.prefix);
    return this.groupByWorld(params);
  }

  async getWorld(worldId: string): Promise<WorldConfig> {
    const params = await this.fetchAllParameters(`${this.prefix}/${worldId}`);
    const worlds = this.groupByWorld(params);
    if (worlds.length === 0) {
      throw new Error(`World "${worldId}" not found in registry`);
    }
    return worlds[0];
  }

  private async fetchAllParameters(path: string): Promise<Parameter[]> {
    const allParams: Parameter[] = [];
    let nextToken: string | undefined;

    do {
      const command = new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        NextToken: nextToken,
      });
      const response = await ssmClient.send(command);
      if (response.Parameters) {
        allParams.push(...response.Parameters);
      }
      nextToken = response.NextToken;
    } while (nextToken);

    return allParams;
  }

  private groupByWorld(params: Parameter[]): WorldConfig[] {
    const worldMap = new Map<string, Partial<WorldConfig>>();

    for (const param of params) {
      if (!param.Name) continue;
      const segments = param.Name.replace(this.prefix + '/', '').split('/');
      if (segments.length !== 2) continue;

      const [worldId, key] = segments;
      if (!worldMap.has(worldId)) {
        worldMap.set(worldId, { worldId });
      }
      const world = worldMap.get(worldId)!;

      switch (key) {
        case 'instance-id':
          world.instanceId = param.Value;
          break;
        case 'server-url':
          world.serverUrl = param.Value;
          break;
        case 'game-name':
          world.gameName = param.Value;
          break;
        case 'server-name':
          world.serverName = param.Value;
          break;
      }
    }

    return Array.from(worldMap.values()).filter(
      (w): w is WorldConfig =>
        w.instanceId !== undefined && w.serverUrl !== undefined && w.gameName !== undefined && w.serverName !== undefined
    );
  }
}

export default WorldRegistryService;
