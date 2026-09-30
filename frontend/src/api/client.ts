/**
 * The one place the app talks to the backend. It adds the login token, turns the backend's RFC 7807 error
 * bodies into ApiError (so forms can show "name: must not be blank" next to the right field), and tells the
 * app when the session is no longer valid (401) so it can send the visitor to the login page.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;
let onUnauthorized: () => void = () => {};

/**
 * The login token is handed over synchronously, at the moment a session is created or restored (see AuthProvider).
 * It must not wait for an effect: React runs child effects before parent effects, so a page that fetches data as
 * soon as it mounts would otherwise send its first request without a token.
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, { method = "GET", body, form, signal, headers: extra }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  const token = accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (form) payload = form;                       // the browser sets the multipart boundary itself
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }

  let response: Response;
  try {
    response = await fetch(path, { method, headers, body: payload, signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }

  if (response.status === 401 && token) onUnauthorized();
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const detail = (data as { detail?: string } | undefined)?.detail;
    const errors = (data as { errors?: Record<string, string> } | undefined)?.errors ?? {};
    throw new ApiError(response.status, detail ?? messageFor(response.status), errors);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return undefined; }
}

function messageFor(status: number): string {
  if (status === 401) return "Please sign in.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "Not found.";
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return "Something went wrong. Please try again.";
}
