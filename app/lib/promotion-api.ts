import type { Promotion } from "../interfaces/Promotion";

function backendUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:4000";
  throw new Error("Configurez NEXT_PUBLIC_API_URL pour charger les promotions côté serveur.");
}

export async function getPromotion(slug: string): Promise<Promotion | null> {
  const response = await fetch(`${backendUrl()}/api/promotions/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Chargement de la promotion impossible (${response.status}).`);
  const data = await response.json() as { promotion: Promotion };
  return data.promotion;
}
