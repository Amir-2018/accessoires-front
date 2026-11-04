import type { Promotion } from "../interfaces/Promotion";
import { assertJsonResponse, getBackendUrl } from "./backend-url";

export async function getPromotion(slug: string): Promise<Promotion | null> {
  const response = await fetch(`${getBackendUrl()}/api/promotions/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Chargement de la promotion impossible (${response.status}).`);
  assertJsonResponse(response);
  const data = await response.json() as { promotion: Promotion };
  return data.promotion;
}
