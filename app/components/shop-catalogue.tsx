"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "../lib/store";
import type { Article } from "../interfaces/Article";
import { apiFetch } from "../lib/api";
import { useCart } from "./shop-shell";

export function Catalogue({ onGoCart, onOpenArticle }: { onGoCart: () => void; onOpenArticle: (article: Article) => void }) {
  const [visibleArticles, setVisibleArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { cart, changeQty, cartCount, updateArticles } = useCart();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apiFetch<{ articles: Article[]; pagination: { totalPages: number } }>(`/api/articles?page=${page}&pageSize=6${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}${category ? `&categorie=${encodeURIComponent(category)}` : ""}`)
        .then((data) => { setVisibleArticles(data.articles); updateArticles(data.articles); setTotalPages(data.pagination.totalPages || 1); })
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [page, query, category, updateArticles]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apiFetch<{ categories: { nom: string }[] }>("/api/categories")
        .then((data) => setCategories(data.categories.map((item) => item.nom)))
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BOUTIQUE</p>
          <h1>Articles</h1>
          <p className="heading-sub">Catalogue public — connectez-vous pour commander avec suivi.</p>
        </div>
        <div className="heading-actions">
          <button className="outline-button" onClick={onGoCart}>Voir le panier ({cartCount})</button>
        </div>
      </div>
      <div className="knowledge-toolbar shop-catalogue-toolbar"><input className="knowledge-search" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Rechercher un article..." aria-label="Rechercher un article" /><select className="catalogue-category-filter" value={category} onChange={(event) => { setPage(1); setCategory(event.target.value); }} aria-label="Filtrer par catégorie"><option value="">Toutes les catégories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      <div className="workflow-grid">
        {visibleArticles.map((a) => (
          <article className="workflow-card product-card" key={a.id} onClick={() => onOpenArticle(a)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpenArticle(a); }} role="button" tabIndex={0}>
            {a.image && <img className="catalogue-image" src={a.image} alt={a.nom} />}
            <span className="workflow-tag">{a.categorie}</span>
            <h2>{a.nom}</h2>
            <p className="heading-sub">{a.description}</p>
            <p><strong>{formatPrice(a.prix)}</strong> <span className="muted-label">Stock : {a.stock}</span></p>
            <div className="suggestion-actions" onClick={(event) => event.stopPropagation()}>
              <button className="outline-button" onClick={() => changeQty(a, -1)} aria-label={`Retirer ${a.nom}`}>−</button>
              <strong>{cart[a.id] ?? 0}</strong>
              <button className="outline-button" onClick={() => changeQty(a, 1)} aria-label={`Ajouter ${a.nom}`}>+</button>
            </div>
            <button className="product-detail-link" onClick={(event) => { event.stopPropagation(); onOpenArticle(a); }}>Voir le détail <span aria-hidden="true">→</span></button>
          </article>
        ))}
      </div>
      <div className="pagination-controls"><button className="outline-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Précédent</button><span className="muted-label">Page {page} sur {totalPages}</span><button className="outline-button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Suivant</button></div>
    </div>
  );
}
