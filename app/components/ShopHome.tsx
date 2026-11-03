"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CartContext, ShopNav, useCartState, type ShopView } from "./shop-shell";
import { Catalogue } from "./shop-catalogue";
import { Panier } from "./shop-panier";
import { ClientMessages, MesCommandes } from "./shop-orders";
import { ArticleDetail } from "./ArticleDetail";
import { faFacebookF, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { Icon } from "./Icon";

/**
 * Accueil = espace client : navbar boutique (panier + commandes + messages),
 * pas de sidebar. Mes commandes / Messages exigent un login client.
 */
export function ShopHome({ initialView = "catalogue" }: { initialView?: ShopView }) {
  const router = useRouter();
  const [view, setView] = useState<ShopView>(initialView);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { value, articles } = useCartState();

  function goLogin() {
    router.push("/login");
  }

  return (
    <CartContext.Provider value={value}>
      <main className="app-shell shop-shell">
        <ShopNav view={view} onNavigate={setView} />
        <div className="page-main shop-main">
          {view === "catalogue" && <Catalogue onGoCart={() => setView("panier")} onOpenArticle={(article) => { setSelectedId(article.id); setView("detail"); }} />}
          {view === "detail" && selectedId && articles.some((article) => article.id === selectedId) && <ArticleDetail article={articles.find((article) => article.id === selectedId)!} onBack={() => setView("catalogue")} onGoCart={() => setView("panier")} />}
          {view === "panier" && <Panier goCommandes={() => setView("commandes")} />}
          {view === "commandes" && <MesCommandes goLogin={goLogin} />}
          {view === "messages" && <ClientMessages goLogin={goLogin} selectedId={selectedId} />}
        </div>
        <footer className="shop-footer">
          <div className="shop-footer-inner">
            <div className="shop-footer-brand">
              <img className="shop-footer-mark" src="/logo.jpg" alt="" />
              <div><strong>OUOU ACCESSOIRES</strong><span>Les détails qui font votre style.</span></div>
            </div>
            <div className="shop-footer-social">
              <span>Suivez-nous</span>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Ouou Accessoires">
                <Icon icon={faInstagram} />
              </a>
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook Ouou Accessoires">
                <Icon icon={faFacebookF} />
              </a>
            </div>
            <p className="shop-footer-copyright">© {new Date().getFullYear()} Ouou Accessoires. Tous droits réservés.</p>
          </div>
        </footer>
      </main>
    </CartContext.Provider>
  );
}
