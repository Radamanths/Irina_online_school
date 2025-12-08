export interface AppConfig {
    apiBaseUrl: string;
    frontendBaseUrl: string;
    paymentsProvider: string;
}
export declare function getAppConfig(env?: NodeJS.ProcessEnv): AppConfig;
export declare function requireEnv(key: string, env?: NodeJS.ProcessEnv): string;
