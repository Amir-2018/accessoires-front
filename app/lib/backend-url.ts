const LINKONLINE = "https://ouou-back.onrender.com"
const LINKLOCAL = "http://localhost:4000" 
const DEPLOYED_BACKEND_URL = LINKLOCAL ;

export function getBackendUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  return DEPLOYED_BACKEND_URL;
}

export function assertJsonResponse(response: Response): void {
  if (!response.headers.get("content-type")?.toLowerCase().includes("json")) {
    throw new Error("L’URL configurée ne renvoie pas une réponse API JSON. Vérifiez l’URL et le déploiement du backend.");
  }
}
