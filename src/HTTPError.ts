type HTTPErrorOptions = {
  status?: number;
  message?: string;
  code?: number;
  error?: any;
  module?: string;
};

export class HTTPError extends Error {
  status: number;
  code: number | undefined = undefined;
  error: any;
  module: string | undefined = undefined;

  constructor({ status, message, code, error, module }: HTTPErrorOptions) {
    super(message);
    this.status = status ?? 500;
    this.code = code;
    this.error = error;
    this.module = module;
  }
}
