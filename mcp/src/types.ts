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
