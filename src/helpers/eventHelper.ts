import { APIGatewayProxyEvent } from 'aws-lambda';
import { ScheduledShutdown } from '../types/events';

export const isScheduledShutdown = (event: APIGatewayProxyEvent | ScheduledShutdown): event is ScheduledShutdown => {
  return (event as ScheduledShutdown).isScheduledShutdown != null;
};

export const isBotRequestEvent = (event: APIGatewayProxyEvent | ScheduledShutdown): event is APIGatewayProxyEvent => {
  const assertedEvent = event as APIGatewayProxyEvent;
  return assertedEvent.body != null && assertedEvent.headers != null;
};
