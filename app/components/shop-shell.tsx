"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getArticles, getSessionUser, type SessionUser } from "../lib/store";
import type { Article } from "../interfaces/Article";
import { faArrowRightFromBracket, faArrowUpRightFromSquare, faBoxOpen, faCartShopping, faChevronDown, faLocationDot, faRightToBracket, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { faFacebookF, faInstagram, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Icon } from "./Icon";

export type ShopView = "catalogue" | "detail" | "panier" | "commandes" | "messages";

type CartCtx = {
  articles: Article[];
  cartLines: Article[];
  cart: Record<string, number>;
  cartCount: number;
  cartTotal: number;
  promotionSlug: string | null;
  updateArticles: (nextArticles: Article[]) => void;
  changeQty: (article: Article, delta: number) => void;
  clearCart: () => void;
  setPromotionSlug: (slug: string | null) => void;
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
  const [promotionSlug, setPromotionSlug] = useState<string | null>(null);

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
    () => ({ articles, cartLines, cart, cartCount, cartTotal, promotionSlug, updateArticles, changeQty, clearCart, setPromotionSlug }),
    [articles, cartLines, cart, cartCount, cartTotal, promotionSlug, updateArticles, clearCart],
  );
  return { value, articles, cart, cartLines, cartCount, cartTotal };
}

export function ShopNav({ view, onNavigate }: { view: ShopView; onNavigate: (v: ShopView) => void }) {
  const router = useRouter();
  const { cartCount } = useCart();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);

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
    setLogoutConfirmationOpen(false);
    setUserMenuOpen(false);
    router.push("/login");
  }

  useEffect(() => {
    if (!logoutConfirmationOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLogoutConfirmationOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [logoutConfirmationOpen]);

  return (
    <>
      <header className="topbar shop-topbar">
        <button className="topbar-brand topbar-brand-link" onClick={() => router.push("/")} aria-label="Retour à l’accueil"><img className="brand-logo-nav" src="/logo.jpg" alt="" /> Ouou Accessoires {hydrated && user && <><span className="topbar-divider" /> <span className="topbar-context">Boutique</span></>}</button>
        <details className="shop-about-menu">
          <summary>À propos de nous <Icon icon={faChevronDown} /></summary>
          <div className="shop-about-panel">
            <p className="eyebrow">NOTRE UNIVERS</p>
            <h2>Ouou Accessoires</h2>
            <p className="shop-about-description">Des accessoires choisis avec soin pour ajouter une touche personnelle à votre style, chaque jour.</p>
            <div className="shop-about-socials" aria-label="Réseaux sociaux">
              <span className="shop-about-social unavailable" aria-label="Instagram, bientôt disponible"><Icon icon={faInstagram} /><span>Instagram <small>Bientôt</small></span></span>
              <span className="shop-about-social unavailable" aria-label="Facebook, bientôt disponible"><Icon icon={faFacebookF} /><span>Facebook <small>Bientôt</small></span></span>
            </div>
            <a className="shop-about-contact" href="https://wa.me/21629467586" target="_blank" rel="noopener noreferrer">
              <Icon icon={faWhatsapp} /><span><strong>WhatsApp</strong><small>+216 29 467 586</small></span>
            </a>
            <div className="shop-about-location">
              <div className="shop-about-contact"><Icon icon={faLocationDot} /><span><strong>Nous trouver</strong><small>Bizerte, Tunisie</small></span></div>
              <iframe
                title="Carte de Bizerte, Tunisie"
                src="https://maps.google.com/maps?q=Bizerte%2C%20Tunisia&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a className="shop-about-map-link" href="https://www.google.com/maps/search/?api=1&query=Bizerte%2C%20Tunisia" target="_blank" rel="noopener noreferrer">
                <Icon icon={faArrowUpRightFromSquare} /> Ouvrir la carte
              </a>
            </div>
          </div>
        </details>
        <nav className="topbar-tabs shop-tabs" aria-label="Navigation boutique">
          {hydrated && user?.role === "client" && <button className={view === "commandes" ? "selected" : ""} onClick={() => onNavigate("commandes")}>Commandes</button>}
        </nav>
        <div className="topbar-user">
          {hydrated && user && <button className="workspace-button" onClick={() => router.push(user.role === "supervisor" ? "/supervisor" : "/client")}>{user.role === "supervisor" ? "Espace admin" : "Espace client"}</button>}
          <button className={`cart-button ${view === "panier" ? "selected" : ""}`} onClick={() => onNavigate("panier")} aria-label={`Panier, ${cartCount} article${cartCount > 1 ? "s" : ""}`} title="Panier">
            <Icon icon={faCartShopping} />
            {cartCount > 0 && <b className="cart-badge">{cartCount}</b>}
          </button>
          {hydrated && user ? (
            <>
              <div className="user-menu">
                <button className="mini-avatar user-menu-trigger" onClick={() => setUserMenuOpen((open) => !open)} aria-label="Ouvrir le menu utilisateur" aria-expanded={userMenuOpen}>
                  {getUserInitials(user.username)}
                </button>
                {userMenuOpen && <div className="user-menu-dropdown"><button onClick={() => { setUserMenuOpen(false); setLogoutConfirmationOpen(true); }}>Déconnexion</button></div>}
              </div>
            </>
          ) : (
            <button className="login-icon-button" onClick={() => router.push("/login")} aria-label="Se connecter" title="Se connecter">
              <Icon icon={faRightToBracket} />
            </button>
          )}
        </div>
      </header>
      {hydrated && user?.role === "client" && (
        <aside className="client-sidebar" aria-label="Espace client">
          <p className="eyebrow">MON ESPACE</p>
          <nav className="client-sidebar-nav" aria-label="Navigation client">
            <button className={view === "commandes" ? "active" : ""} onClick={() => onNavigate("commandes")}><Icon icon={faBoxOpen} /> <span>Commandes</span></button>
          </nav>
        </aside>
      )}
      {logoutConfirmationOpen && (
        <div
          className="logout-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLogoutConfirmationOpen(false);
          }}
        >
          <section className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description">
            <span className="logout-dialog-icon"><Icon icon={faTriangleExclamation} /></span>
            <h2 id="logout-dialog-title">Se déconnecter ?</h2>
            <p id="logout-dialog-description">Voulez-vous vraiment quitter votre session ?</p>
            <div className="logout-dialog-actions">
              <button className="outline-button" onClick={() => setLogoutConfirmationOpen(false)} autoFocus>Annuler</button>
              <button className="dark-button logout-confirm-button" onClick={logout}><Icon icon={faArrowRightFromBracket} /> Se déconnecter</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function getUserInitials(username: string): string {
  const parts = username.split(/[.\s_-]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "U"}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase();
}

export { CartContext };
