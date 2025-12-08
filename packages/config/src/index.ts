export interface AppConfig {
  apiBaseUrl: string;
  frontendBaseUrl: string;
  paymentsProvider: string;
}

const defaults: AppConfig = {
  apiBaseUrl: "http://localhost:4000",
  frontendBaseUrl: "http://localhost:3000",
  paymentsProvider: "stripe"
};

export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    apiBaseUrl: env.NEXT_PUBLIC_API_BASE || env.API_BASE_URL || defaults.apiBaseUrl,
    frontendBaseUrl: env.FRONTEND_BASE_URL || defaults.frontendBaseUrl,
    paymentsProvider: env.PAYMENTS_PROVIDER || defaults.paymentsProvider
  };
}

export function requireEnv(key: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}
