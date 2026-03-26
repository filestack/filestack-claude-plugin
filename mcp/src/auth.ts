export const PLACEHOLDER_API_KEY = 'APQLlwqrRScGxhw78gs9Wz';
export const SIGNUP_URL = 'https://dev.filestack.com/signup/free/';

export interface Credentials {
  apiKey: string;
  appSecret: string | null;
}

export function getCredentials(): Credentials {
  return {
    apiKey: process.env.FILESTACK_API_KEY || PLACEHOLDER_API_KEY,
    appSecret: process.env.FILESTACK_APP_SECRET ?? null,
  };
}

export function hasApiKey(): boolean {
  return Boolean(process.env.FILESTACK_API_KEY || PLACEHOLDER_API_KEY);
}

export function isPlaceholderKey(): boolean {
  const key = process.env.FILESTACK_API_KEY;
  return !key || key === PLACEHOLDER_API_KEY;
}

export function hasAppSecret(): boolean {
  return Boolean(process.env.FILESTACK_APP_SECRET);
}
