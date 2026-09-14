/**
 * Message échangé à propos d'une commande.
 * Le client voit uniquement les messages liés à SES commandes,
 * l'agent/superviseur voit ceux de toutes les commandes.
 */
export type MessageAuthorRole = "client" | "agent" | "supervisor" | "system";

export interface OrderMessage {
  id: string;
  orderId: string;
  authorRole: MessageAuthorRole;
  authorNom: string;
  text: string;
  createdAt: string;
}
