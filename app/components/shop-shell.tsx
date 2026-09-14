"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getArticles, getSessionUser, type SessionUser } from "../lib/store";
import type { Article } from "../interfaces/Article";

export type ShopView = "catalogue" | "detail" | "panier" | "commandes" | "messages";

type CartCtx = {
  articles: Article[];
  cartLines: Article[];
  cart: Record<string, number>;
  cartCount: number;
  cartTotal: number;
  updateArticles: (nextArticles: Article[]) => void;
  changeQty: (article: Article, delta: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartCtx | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart hors ShopHome");
  return ctx;
}

export function useCartState() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [articles, setArticles] = useState<Article[]>(() => getArticles());

  const updateArticles = useCallback((nextArticles: Article[]) => {
    setArticles((current) => {
      const merged = new Map(current.map((article) => [article.id, article]));
      nextArticles.forEach((article) => merged.set(article.id, article));
      return Array.from(merged.values());
    });
  }, []);

  function changeQty(article: Article, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, Math.min(article.stock, (prev[article.id] ?? 0) + delta));
      return { ...prev, [article.id]: next };
    });
  }

  const clearCart = useCallback(() => setCart({}), []);
  const cartLines = articles.filter((a) => (cart[a.id] ?? 0) > 0);
  const cartCount = cartLines.reduce((n, a) => n + (cart[a.id] ?? 0), 0);
  const cartTotal = cartLines.reduce((sum, a) => sum + a.prix * (cart[a.id] ?? 0), 0);
  const value = useMemo(
    () => ({ articles, cartLines, cart, cartCount, cartTotal, updateArticles, changeQty, clearCart }),
    [articles, cartLines, cart, cartCount, cartTotal, updateArticles, clearCart],
  );
  return { value, articles, cart, cartLines, cartCount, cartTotal };
}

export function ShopNav({ view, onNavigate }: { view: ShopView; onNavigate: (v: ShopView) => void }) {
  const router = useRouter();
  const { cartCount } = useCart();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUser(getSessionUser());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function logout() {
    localStorage.removeItem("zen:user");
    setUser(null);
    router.push("/login");
  }

  return (
    <>
      <header className="topbar shop-topbar">
        <button className="topbar-brand topbar-brand-link" onClick={() => router.push("/")} aria-label="Retour à l’accueil"><span className="brand-dot" /> Ouou Accessoires <span className="topbar-divider" /> <span className="topbar-context">Boutique</span></button>
        <nav className="topbar-tabs shop-tabs" aria-label="Navigation boutique">
          {hydrated && user?.role === "client" && <button className={view === "commandes" ? "selected" : ""} onClick={() => onNavigate("commandes")}>Commandes</button>}
        </nav>
        <div className="topbar-user">
          {hydrated && user && <button className="workspace-button" onClick={() => router.push(user.role === "supervisor" ? "/supervisor" : "/client")}>{user.role === "supervisor" ? "Espace admin" : "Espace client"}</button>}
          <button className={`cart-button ${view === "panier" ? "selected" : ""}`} onClick={() => onNavigate("panier")} aria-label={`Panier, ${cartCount} article${cartCount > 1 ? "s" : ""}`} title="Panier">
            <span aria-hidden="true">🛒</span>
            {cartCount > 0 && <b className="cart-badge">{cartCount}</b>}
          </button>
          {hydrated && user ? (
            <>
              <div className="user-menu">
                <button className="mini-avatar user-menu-trigger" onClick={() => setUserMenuOpen((open) => !open)} aria-label="Ouvrir le menu utilisateur" aria-expanded={userMenuOpen}>
                  {getUserInitials(user.username)}
                </button>
                {userMenuOpen && <div className="user-menu-dropdown"><button onClick={logout}>Déconnexion</button></div>}
              </div>
            </>
          ) : (
            <button className="dark-button" onClick={() => router.push("/login")}>Se connecter</button>
          )}
        </div>
      </header>
      {hydrated && user?.role === "client" && (
        <aside className="client-sidebar" aria-label="Espace client">
          <p className="eyebrow">MON ESPACE</p>
          <nav className="client-sidebar-nav" aria-label="Navigation client">
            <button className={view === "commandes" ? "active" : ""} onClick={() => onNavigate("commandes")}>▦ <span>Commandes</span></button>
          </nav>
        </aside>
      )}
    </>
  );
}

function getUserInitials(username: string): string {
  const parts = username.split(/[.\s_-]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "U"}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase();
}

export { CartContext };
