const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL && process.env.NODE_ENV === "production") {
    throw new Error("URL du backend manquante. Configurez NEXT_PUBLIC_API_URL dans le service frontend.");
  }
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
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}
