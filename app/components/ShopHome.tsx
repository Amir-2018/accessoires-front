"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CartContext, ShopNav, useCartState, type ShopView } from "./shop-shell";
import { Catalogue } from "./shop-catalogue";
import { Panier } from "./shop-panier";
import { ClientMessages, MesCommandes } from "./shop-orders";
import { ArticleDetail } from "./ArticleDetail";

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
      </main>
    </CartContext.Provider>
  );
}
