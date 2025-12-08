# @virgo/config

Shared runtime configuration helpers for all Virgo apps. The source files are consumed directly through TypeScript path aliases, so no build step is required yet.

## API

- `getAppConfig(env?)` — returns a typed object with resolved runtime values (API base URL, frontend URL, payment provider keys, etc.). Defaults fall back to local dev ports.
- `requireEnv(key, env?)` — utility to enforce required environment variables for Node runtimes.
