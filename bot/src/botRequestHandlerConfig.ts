const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const env = {
  RESPONSE_FUNC_ARN: requireEnv('RESPONSE_FUNC_ARN'),
  REGION: requireEnv('REGION'),
  BOT_PUBLIC_KEY: requireEnv('BOT_PUBLIC_KEY'),
};

export default {
  env,
};
