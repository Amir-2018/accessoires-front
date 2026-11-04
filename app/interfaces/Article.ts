/**
 * Article — produit visible par le client dans la boutique.
 */
export interface Article {
  id: string;
  nom: string;
  image: string;
  description: string;
  prix: number;
  stock: number;
  categorie: string;
  promotion?: {
    id: string;
    slug: string;
    title: string;
    discountPercent: number;
    startDate: string;
    endDate: string;
    isActive?: boolean;
  } | null;
}
