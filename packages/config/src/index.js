"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppConfig = getAppConfig;
exports.requireEnv = requireEnv;
const defaults = {
    apiBaseUrl: "http://localhost:4000",
    frontendBaseUrl: "http://localhost:3000",
    paymentsProvider: "stripe"
};
function getAppConfig(env = process.env) {
    return {
        apiBaseUrl: env.NEXT_PUBLIC_API_BASE || env.API_BASE_URL || defaults.apiBaseUrl,
        frontendBaseUrl: env.FRONTEND_BASE_URL || defaults.frontendBaseUrl,
        paymentsProvider: env.PAYMENTS_PROVIDER || defaults.paymentsProvider
    };
}
function requireEnv(key, env = process.env) {
    const value = env[key];
    if (!value) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value;
}
//# sourceMappingURL=index.js.map