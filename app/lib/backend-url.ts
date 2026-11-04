const DEPLOYED_BACKEND_URL = "https://accesoires-back-3l9dgq2ca-amir-dev1.vercel.app";

export function getBackendUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:4000";
  return DEPLOYED_BACKEND_URL;
}

export function assertJsonResponse(response: Response): void {
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
    throw new Error("L’URL configurée ne renvoie pas une réponse API JSON. Vérifiez l’URL et le déploiement du backend.");
  }
}
