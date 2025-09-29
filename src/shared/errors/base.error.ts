export interface AppErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
  readonly metadata?: Record<string, unknown>;
  readonly exposeMessage?: boolean;
}

export class AppError extends Error {
  public readonly code: string;

  public readonly statusCode: number;

  public readonly metadata: Record<string, unknown>;

  public readonly exposeMessage: boolean;

  public constructor(options: AppErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.metadata = options.metadata ?? {};
    this.exposeMessage = options.exposeMessage ?? false;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(this, AppError);
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
