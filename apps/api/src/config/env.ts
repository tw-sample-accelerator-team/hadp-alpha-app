export interface AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
}

export class ConfigError extends Error {}

type Env = Readonly<Record<string, string | undefined>>;

const required = (env: Env, name: string): string => {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    throw new ConfigError(`${name} must be set (see .env.example)`);
  }
  return value;
};

const port = (env: Env, fallback: number): number => {
  const raw = env["PORT"];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new ConfigError(`PORT must be an integer between 0 and 65535, got "${raw}"`);
  }
  return value;
};

export const loadConfig = (env: Env = process.env): AppConfig => ({
  port: port(env, 3000),
  databaseUrl: required(env, "DATABASE_URL"),
});
