import { env } from "./env";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  readonly token?: string;
  readonly method?: string;
  readonly body?: unknown;
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token === undefined
        ? {}
        : { authorization: `Bearer ${options.token}` }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as {
      message?: unknown;
      code?: unknown;
      error?: unknown;
    };
    const message =
      typeof payload.message === "string"
        ? payload.message
        : typeof payload.code === "string"
          ? payload.code
          : typeof payload.error === "string"
            ? payload.error
            : `Request failed with status ${response.status}`;

    return new ApiError(
      message,
      response.status,
      typeof payload.code === "string" ? payload.code : undefined,
    );
  } catch {
    return new ApiError(`Request failed with status ${response.status}`, response.status);
  }
}
