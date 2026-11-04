"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getArticles, getSessionUser, type SessionUser } from "../lib/store";
import type { Article } from "../interfaces/Article";
import { faArrowRightFromBracket, faArrowUpRightFromSquare, faBars, faBoxOpen, faCartShopping, faChevronDown, faLocationDot, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
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
const CART_STORAGE_KEY = "zen:cart";
const EMPTY_CART: Record<string, number> = {};

type SavedCart = {
  cart: Record<string, number>;
  articles: Article[];
};

let savedCartRaw: string | null | undefined;
let savedCartSnapshot: SavedCart | null = null;
const cartListeners = new Set<() => void>();

function getSavedCartSnapshot(): SavedCart | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw === savedCartRaw) return savedCartSnapshot;
    savedCartRaw = raw;
    if (!raw) {
      savedCartSnapshot = null;
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedCart>;
    savedCartSnapshot =
      parsed.cart && typeof parsed.cart === "object" && Array.isArray(parsed.articles)
        ? { cart: parsed.cart, articles: parsed.articles }
        : null;
    return savedCartSnapshot;
  } catch (reason) {
    console.error("Impossible de restaurer le panier enregistré.", reason);
    savedCartRaw = null;
    savedCartSnapshot = null;
    return null;
  }
}

function subscribeToSavedCart(listener: () => void) {
  cartListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      savedCartRaw = undefined;
      getSavedCartSnapshot();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    cartListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function updateSavedCart(nextCart: SavedCart | null) {
  savedCartSnapshot = nextCart;
  try {
    if (nextCart) {
      savedCartRaw = JSON.stringify(nextCart);
      localStorage.setItem(CART_STORAGE_KEY, savedCartRaw);
    } else {
      savedCartRaw = null;
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  } catch (reason) {
    console.error("Impossible d’enregistrer le panier.", reason);
  }
  cartListeners.forEach((listener) => listener());
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart hors ShopHome");
  return ctx;
}

export function useCartState() {
  const [baseArticles, setBaseArticles] = useState<Article[]>(() => getArticles());
  const savedCart = useSyncExternalStore(subscribeToSavedCart, getSavedCartSnapshot, () => null);
  const cart = savedCart?.cart ?? EMPTY_CART;
  const articles = useMemo(() => {
    const merged = new Map((savedCart?.articles ?? []).map((article) => [article.id, article]));
    baseArticles.forEach((article) => merged.set(article.id, article));
    return Array.from(merged.values());
  }, [baseArticles, savedCart]);
  const [promotionSlug, setPromotionSlug] = useState<string | null>(null);

  const updateArticles = useCallback((nextArticles: Article[]) => {
    setBaseArticles((current) => {
      const merged = new Map(current.map((article) => [article.id, article]));
      nextArticles.forEach((article) => merged.set(article.id, article));
      return Array.from(merged.values());
    });
  }, []);

  function changeQty(article: Article, delta: number) {
    const current = getSavedCartSnapshot();
    const nextQty = Math.max(0, Math.min(article.stock, (current?.cart[article.id] ?? 0) + delta));
    const nextCart = { ...(current?.cart ?? {}), [article.id]: nextQty };
    const nextArticles = new Map((current?.articles ?? []).map((savedArticle) => [savedArticle.id, savedArticle]));
    if (nextQty > 0) nextArticles.set(article.id, article);
    else nextArticles.delete(article.id);
    updateSavedCart({ cart: nextCart, articles: Array.from(nextArticles.values()) });
  }

  const clearCart = useCallback(() => {
    updateSavedCart(null);
  }, []);
  const cartLines = articles.filter((a) => (cart[a.id] ?? 0) > 0);
  const cartCount = cartLines.reduce((n, a) => n + (cart[a.id] ?? 0), 0);
  const cartTotal = cartLines.reduce((sum, a) => sum + a.prix * (cart[a.id] ?? 0), 0);
  const value = useMemo(
    () => ({ articles, cartLines, cart, cartCount, cartTotal, promotionSlug, updateArticles, changeQty, clearCart, setPromotionSlug }),
    [articles, cartLines, cart, cartCount, cartTotal, promotionSlug, updateArticles, clearCart],
  );
  return { value, articles, cart, cartLines, cartCount, cartTotal };
}

export function ShopNav({ view, onNavigate, onReturnHome, sidebarOpen, onToggleSidebar }: { view: ShopView; onNavigate: (v: ShopView) => void; onReturnHome: () => void; sidebarOpen: boolean; onToggleSidebar: () => void }) {
  const router = useRouter();
  const { cartCount } = useCart();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

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

  function closeSidebar() {
    onToggleSidebar();
    menuToggleRef.current?.focus();
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
        <button className="topbar-brand topbar-brand-link" onClick={onReturnHome} aria-label="Retour à l’accueil"><img className="brand-logo-nav" src="/logo.jpg" alt="" /> Ouou Accessoires</button>
        {!(hydrated && user?.role === "supervisor") && <details className="shop-about-menu">
          <summary>À propos de nous <Icon icon={faChevronDown} /></summary>
          <div className="shop-about-panel">
            <p className="eyebrow">NOTRE UNIVERS</p>
            <h2>Ouou Accessoires</h2>
            <p className="shop-about-description">Des accessoires choisis avec soin pour ajouter une touche personnelle à votre style, chaque jour.</p>
            <div className="shop-about-socials" aria-label="Réseaux sociaux">
              <span className="shop-about-social unavailable" aria-label="Instagram, bientôt disponible"><Icon icon={faInstagram} /><span>Instagram <small>Bientôt</small></span></span>
              <a className="shop-about-social" href="https://www.facebook.com/search/top?q=ouou" target="_blank" rel="noopener noreferrer" aria-label="Facebook Ouou Accessoires">
                <Icon icon={faFacebookF} /><span>Facebook <small>Nous suivre</small></span>
              </a>
            </div>
            <a className="shop-about-contact" href="https://wa.me/21620000801" target="_blank" rel="noopener noreferrer">
              <Icon icon={faWhatsapp} /><span><strong>WhatsApp</strong><small>+216 20 000 801</small></span>
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
        </details>}
        <div className="topbar-user">
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
            <Link className="login-text-link" href="/login">Connexion</Link>
          )}
        </div>
      </header>
      {hydrated && user && <button ref={menuToggleRef} className={`menu-toggle shop-menu-toggle${sidebarOpen ? " is-open" : ""}`} onClick={() => user.role === "supervisor" ? router.push("/supervisor") : onToggleSidebar()} aria-label={user.role === "supervisor" ? "Ouvrir l’espace administrateur" : sidebarOpen ? "Masquer le menu" : "Afficher le menu"} aria-expanded={user.role === "client" ? sidebarOpen : undefined}><Icon icon={user.role === "client" && sidebarOpen ? faXmark : faBars} /></button>}
      {hydrated && user?.role === "client" && sidebarOpen && <button className="client-sidebar-backdrop" onClick={closeSidebar} aria-label="Fermer le menu" />}
      {hydrated && user?.role === "client" && (
        <aside className={`client-sidebar${sidebarOpen ? " open" : ""}`} aria-label="Espace client" aria-hidden={!sidebarOpen}>
          <div className="sidebar-account">
            <span className="sidebar-account-avatar" aria-hidden="true">{getUserInitials(user.username)}</span>
            <span className="sidebar-account-name">{user.username}</span>
          </div>
          <p className="eyebrow">MON ESPACE</p>
          <nav className="client-sidebar-nav" aria-label="Navigation client">
            <button className={view === "commandes" ? "active" : ""} onClick={() => { onNavigate("commandes"); closeSidebar(); }} tabIndex={sidebarOpen ? 0 : -1}><Icon icon={faBoxOpen} /> <span>Commandes</span></button>
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
