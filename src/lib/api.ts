let csrf: string | null = null;
export function resetCsrf() {
  csrf = null;
}
export async function api<T = any>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  if (method !== "GET" && !csrf) await api("/auth/session");
  const form = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(options.body && !form ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": csrf ?? "" } : {}),
        ...options.headers,
      },
      body:
        options.body === undefined
          ? undefined
          : form
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: AbortSignal.timeout(form ? 120000 : 30000),
    });
  } catch {
    throw new Error("Cannot reach the LegalFlow server. Check your connection and try again.");
  }
  const data = await response
    .json()
    .catch(() => ({ error: "The server returned an unreadable response" }));
  if (!response.ok) {
    const error = Object.assign(new Error(data.error ?? "Request failed"), {
      status: response.status,
    });
    if (response.status === 401) csrf = null;
    throw error;
  }
  if (data.csrfToken) csrf = data.csrfToken;
  return data;
}
