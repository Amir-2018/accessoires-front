export const promotions = [
  {
    title: "Les détails qui changent tout",
    discountPercent: 30,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    title: "Un éclat au quotidien",
    discountPercent: 20,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    title: "Le sac idéal vous attend",
    discountPercent: 0,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
] as const;

type PromotionPeriod = {
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
};

export function isPromotionInDateRange(promotion: PromotionPeriod | null | undefined, now = new Date()): boolean {
  if (!promotion || promotion.isActive === false) return false;

  const today = now.toISOString().slice(0, 10);
  const startDate = promotion.startDate?.slice(0, 10);
  const endDate = promotion.endDate?.slice(0, 10);

  return (!startDate || today >= startDate) && (!endDate || today <= endDate);
}

export function discountedUnitPrice(price: number, discountPercent: number): number {
  return Math.round(price * (1 - discountPercent / 100) * 1000) / 1000;
}
