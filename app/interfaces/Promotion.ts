export interface Promotion {
  id: string;
  slug: string;
  title: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
