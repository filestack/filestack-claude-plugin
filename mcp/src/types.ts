export interface ToolSuccess<T> {
  result: T;
  error: null;
}

export interface ToolError {
  result: null;
  error: {
    code: number | string;
    message: string;
  };
}

export type ToolResult<T> = ToolSuccess<T> | ToolError;

export function success<T>(data: T): ToolSuccess<T> {
  return { result: data, error: null };
}

export function toolError(code: number | string, message: string): ToolError {
  return { result: null, error: { code, message } };
}

export const AUTH_ERROR = toolError(
  'auth_required',
  'FILESTACK_API_KEY is not set. Add it to your environment: export FILESTACK_API_KEY=your_key'
);

export const SECRET_ERROR = toolError(
  'auth_required',
  'FILESTACK_APP_SECRET is not set. Add it to your environment: export FILESTACK_APP_SECRET=your_secret'
);

export const PLACEHOLDER_WARNING =
  '⚠️  WARNING: You are using a placeholder API key (APQLlwqrRScGxhw78gs9Wz). ' +
  'This key has limited functionality and is for demo purposes only. ' +
  'To use the full Filestack platform, sign up for your own API key at: ' +
  'https://dev.filestack.com/signup/free/ ' +
  'Then set it with: export FILESTACK_API_KEY=your_api_key';
