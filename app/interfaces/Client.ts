import type { User } from "./User";

/**
 * Client — hérite de User avec le rôle fixe "client".
 * Utilisateur final du service client (Web, Email, WhatsApp).
 */
export interface Client extends User {
  role: "client";
}
