import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { verifyKey } from 'discord-interactions';

const isAuthorized = (headers: APIGatewayProxyEventHeaders, body: string, botPublicKey: string): boolean => {
  const authSignature = headers['x-signature-ed25519'];
  const authTimestamp = headers['x-signature-timestamp'];

  return verifyKey(body, authSignature, authTimestamp, botPublicKey);
};

export default {
  isAuthorized,
};
