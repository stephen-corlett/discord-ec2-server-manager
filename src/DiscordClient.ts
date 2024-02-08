import axios from 'axios';
import { APIChatInputApplicationCommandInteraction } from 'discord-api-types/payloads/v9';
import { RESTPostAPIWebhookWithTokenJSONBody } from 'discord-api-types/rest/v9';

class DiscordClient {
  constructor(private botApplicationId: string, private botClientSecret: string) {}
  public sendDiscordResponse = async (
    event: APIChatInputApplicationCommandInteraction,
    message: string
  ): Promise<void> => {
    const { id: interactionId, token: interactionToken } = event;
    if (!interactionId || !interactionToken) {
      throw new Error('Could not find required interaction data.');
    }

    const body: RESTPostAPIWebhookWithTokenJSONBody = {
      tts: false,
      content: message,
      embeds: [],
    };
    await this.postToDiscordWebhook(body, interactionToken);
    console.log('Successfully sent discord request');
  };

  private postToDiscordWebhook = async (body: RESTPostAPIWebhookWithTokenJSONBody, interactionToken: string) => {
    const requestOptions = {
      headers: {
        Authorization: `Bot ${this.botClientSecret}`,
      },
    };
    try {
      const url = `https://discord.com/api/v8/webhooks/${this.botApplicationId}/${interactionToken}`;
      const response = await axios.post(url, body, requestOptions);
      if (response.status >= 300) {
        throw new Error(`Discord request returned non-success status ${response.status}`);
      }
    } catch (exception) {
      console.log(`There was an error posting a response: ${JSON.stringify(exception)}`);
      throw new Error('Failed to post to webhook');
    }
  };
}

export default DiscordClient;
