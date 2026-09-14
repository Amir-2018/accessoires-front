/**
 * Ligne de commande : un article + une quantité.
 */
export interface OrderItem {
  articleId: string;
  nom: string;
  prix: number;
  quantite: number;
}

export type OrderStatus = "en-attente" | "validee" | "expediee" | "livree";

/**
 * Commande passée par un client, visible par les agents et superviseurs.
 */
export interface Order {
  id: string;
  clientId: string;
  clientNom: string;
  clientPrenom?: string;
  clientEmail?: string;
  clientTelephone?: string;
  clientAdresse?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  "en-attente": "En attente",
  validee: "Validée",
  expediee: "Expédiée",
  livree: "Livrée",
};

/** Rôles autorisés à voir l'ensemble des commandes. */
export const ORDER_VIEWER_ROLES = ["supervisor"] as const;
