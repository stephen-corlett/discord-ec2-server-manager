import {
  APIBaseInteraction,
  APIApplicationCommandInteraction,
  InteractionType,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
} from 'discord-api-types/v9';

export const isDiscordPing = (
  apiResponse: unknown
): apiResponse is APIBaseInteraction<InteractionType.Ping, unknown> => {
  return (apiResponse as APIBaseInteraction<InteractionType.Ping, unknown>)?.type === InteractionType.Ping;
};

export const isDiscordApplicationCommand = (apiResponse: unknown): apiResponse is APIApplicationCommandInteraction => {
  return (apiResponse as APIApplicationCommandInteraction)?.type === InteractionType.ApplicationCommand;
};

export const isDiscordChatInputCommand = (
  apiResponse: APIApplicationCommandInteraction
): apiResponse is APIChatInputApplicationCommandInteraction => {
  return apiResponse.data.type === ApplicationCommandType.ChatInput;
};
