"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "../interfaces/User";
import { defaultRoute, getSessionUser, logout, type SessionUser } from "./store";

type Role = UserRole;

/**
 * Garde d'accès : exige une session + l'un des rôles autorisés.
 * Sans session → redirige vers /login.
 * Mauvais rôle → redirige vers son espace par défaut.
 */
export function useRequireRole(allowed: Role[]) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const allowedKey = allowed.join(",");

  useEffect(() => {
    const session = getSessionUser();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!allowed.includes(session.role)) {
      router.replace(defaultRoute(session.role));
      return;
    }
    setUser(session);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, allowedKey]);

  function signOut() {
    logout();
    router.replace("/login");
  }

  return { user, ready, signOut };
}
