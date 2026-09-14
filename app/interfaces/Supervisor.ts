import type { User } from "./User";

/**
 * Supervisor — hérite de User avec le rôle fixe "supervisor".
 * Vue Pilotage : qualité, charge de l'équipe, validations.
 */
export interface Supervisor extends User {
  role: "supervisor";
}

