import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { verifyKey } from 'discord-interactions';
import { UnauthorizedError } from '../errors';
import config from '../config';

const verifyAuthorization = (headers: APIGatewayProxyEventHeaders, body: string): void | never => {
  const authSignature = headers['x-signature-ed25519'];
  const authTimestamp = headers['x-signature-timestamp'];

  if (!verifyKey(body, authSignature, authTimestamp, config.env.BOT_PUBLIC_KEY)) {
    throw new UnauthorizedError();
  }
};

export default {
  verifyAuthorization,
};
