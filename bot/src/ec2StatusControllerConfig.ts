const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const env = {
  REGION: requireEnv('REGION'),
  BOT_APPLICATION_ID: requireEnv('BOT_APPLICATION_ID'),
  BOT_CLIENT_SECRET: requireEnv('BOT_CLIENT_SECRET'),
  BOT_PUBLIC_KEY: requireEnv('BOT_PUBLIC_KEY'),
  SSM_WORLD_PREFIX: requireEnv('SSM_WORLD_PREFIX'),
};

export default {
  env,
};
