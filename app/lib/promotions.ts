export const promotions = [
  {
    slug: "details-qui-changent-tout",
    discountPercent: 30,
    badge: "JUSQU'À -30%",
    kicker: "LA PETITE TOUCHE EN PLUS",
    title: "Les détails qui changent tout",
    description: "Une sélection d'accessoires pour donner du caractère à vos tenues.",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Sélection de bijoux et accessoires",
    detailTitle: "Les petits détails, le grand effet",
    detailDescription: "Un bijou bien choisi suffit à révéler une tenue. Découvrez notre sélection d'accessoires et trouvez la pièce qui vous ressemble.",
    highlights: ["Jusqu'à 30 % de réduction sur une sélection", "Des accessoires faciles à associer", "Des idées pour offrir ou se faire plaisir"],
  },
  {
    slug: "eclat-au-quotidien",
    discountPercent: 20,
    badge: "-20% SUR LA SÉLECTION",
    kicker: "UN ÉCLAT À CHAQUE INSTANT",
    title: "Un éclat au quotidien",
    description: "Découvrez des pièces faciles à porter et à associer.",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Bijoux dorés présentés sur un fond clair",
    detailTitle: "Votre éclat, tous les jours",
    detailDescription: "Des bijoux délicats à porter seuls ou à accumuler : composez facilement un style qui vous accompagne du matin au soir.",
    highlights: ["20 % de réduction sur la sélection concernée", "Des pièces à porter seules ou en accumulation", "Des idées pour compléter votre collection"],
  },
  {
    slug: "sac-ideal",
    discountPercent: 0,
    badge: "OFFRE DU MOMENT",
    kicker: "VOTRE NOUVEAU COMPAGNON",
    title: "Le sac idéal vous attend",
    description: "Des modèles pensés pour vous accompagner partout.",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85",
    imageAlt: "Sac à main élégant",
    detailTitle: "Un sac pour vous suivre partout",
    detailDescription: "Pour vos journées bien remplies ou vos sorties, explorez des modèles pensés pour apporter une touche élégante à votre quotidien.",
    highlights: ["Une sélection de sacs à découvrir", "Des modèles pour vos journées et vos sorties", "Trouvez votre prochain compagnon du quotidien"],
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
