import {
  APIBaseInteraction,
  APIApplicationCommandInteraction,
  InteractionType,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandType,
} from 'discord-api-types/v9';

export const isDiscordPing = (
  apiResponse: APIBaseInteraction<InteractionType, unknown>
): apiResponse is APIBaseInteraction<InteractionType.Ping, unknown> => {
  return apiResponse?.type === InteractionType.Ping;
};

export const isDiscordApplicationCommand = (
  apiResponse: APIBaseInteraction<InteractionType, unknown>
): apiResponse is APIApplicationCommandInteraction => {
  return apiResponse?.type === InteractionType.ApplicationCommand;
};

export const isDiscordChatInputCommand = (
  apiResponse: APIApplicationCommandInteraction
): apiResponse is APIChatInputApplicationCommandInteraction => {
  return apiResponse.data.type === ApplicationCommandType.ChatInput;
};
