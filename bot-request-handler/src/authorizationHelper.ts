import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { verifyKey } from 'discord-interactions';

import config from './config';

const verifyAuthorization = (
  headers: APIGatewayProxyEventHeaders,
  body: string,
): Boolean => {
  const authSignature = headers['x-signature-ed25519'];
  const authTimestamp = headers['x-signature-timestamp'];

  return verifyKey(body, authSignature, authTimestamp, config.env.BOT_PUBLIC_KEY);
};

export default {
  verifyAuthorization,
};
