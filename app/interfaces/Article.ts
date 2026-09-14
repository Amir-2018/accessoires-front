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
}
