/**
 * Interface de base pour tous les utilisateurs de la plateforme ZEN.
 */
export type UserRole = "supervisor" | "client";

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

