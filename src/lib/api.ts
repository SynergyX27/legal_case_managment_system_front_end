import { userErrorMessage } from "./user-error";
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
      signal: AbortSignal.timeout(
        form ||
          ["/cases/import/commit", "/cases/bulk", "/cases/team", "/reports/cases/export"].includes(
            path,
          )
          ? 120000
          : 30000,
      ),
    });
  } catch {
    throw new Error(
      "LegalFlow could not connect. Check your internet connection, then reopen the item and check whether your earlier change was saved before trying again.",
    );
  }
  const data = await response.json().catch(() => {
    if (response.status === 401) csrf = null;
    throw new Error(
      userErrorMessage("The server returned an unreadable response", response.status),
    );
  });
  if (!response.ok) {
    const error = Object.assign(new Error(userErrorMessage(data.error, response.status)), {
      status: response.status,
      code: data.code,
      title: data.title,
      guidance: data.guidance,
      requestId: data.requestId,
      fieldErrors: data.fieldErrors,
    });
    if (response.status === 401) csrf = null;
    throw error;
  }
  if (data.csrfToken) csrf = data.csrfToken;
  return data;
}

export async function apiBlob(path: string, body: unknown): Promise<Blob> {
  if (!csrf) await api("/auth/session");
  let r: Response;
  try {
    r = await fetch(`/api${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf ?? "" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error(
      "The report connection was interrupted. Check your internet connection, then try a smaller selection of cases. If it continues, contact your administrator.",
    );
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(
      userErrorMessage(
        e.error ||
          "The report could not be prepared. Try a smaller selection of cases and generate it again.",
        r.status,
      ),
    );
  }
  return r.blob();
}
