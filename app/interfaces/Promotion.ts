export interface Promotion {
  id: string;
  slug: string;
  discountPercent: number;
  badge: string;
  kicker: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  detailTitle: string;
  detailDescription: string;
  highlights: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}
