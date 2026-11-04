import { assertJsonResponse, getBackendUrl } from "./backend-url";

const API_URL = getBackendUrl();

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, credentials: "include", headers: { "content-type": "application/json", ...(options.headers ?? {}) } });
  } catch {
    throw new Error("Service backend inaccessible. Vérifiez NEXT_PUBLIC_API_URL et l’état du service API.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ? `${response.status}: ${body.error}` : `Erreur API (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  assertJsonResponse(response);
  return response.json() as Promise<T>;
}
