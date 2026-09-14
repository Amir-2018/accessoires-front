"use client";

import { formatPrice } from "../lib/store";
import type { Article } from "../interfaces/Article";
import { useCart } from "./shop-shell";

export function ArticleDetail({ article, onBack, onGoCart }: { article: Article; onBack: () => void; onGoCart: () => void }) {
  const { cart, changeQty, cartCount } = useCart();
  const quantity = cart[article.id] ?? 0;

  return (
    <div className="view-content article-detail-page">
      <button className="back-link" onClick={onBack}>← Retour aux articles</button>
      <div className="article-detail panel">
        <div className="article-detail-media">
          {article.image ? <img src={article.image} alt={article.nom} /> : <span className="article-no-image">Image non disponible</span>}
        </div>
        <div className="article-detail-content">
          <span className="workflow-tag">{article.categorie}</span>
          <h1>{article.nom}</h1>
          <p className="article-detail-price">{formatPrice(article.prix)}</p>
          <p className="article-detail-description">{article.description}</p>
          <p className="muted-label">{article.stock > 0 ? `${article.stock} article${article.stock > 1 ? "s" : ""} disponible${article.stock > 1 ? "s" : ""}` : "Rupture de stock"}</p>
          <div className="article-detail-actions">
            <div className="suggestion-actions" aria-label="Quantité">
              <button className="outline-button" onClick={() => changeQty(article, -1)} disabled={quantity === 0} aria-label={`Retirer ${article.nom}`}>−</button>
              <strong>{quantity}</strong>
              <button className="outline-button" onClick={() => changeQty(article, 1)} disabled={quantity >= article.stock} aria-label={`Ajouter ${article.nom}`}>+</button>
            </div>
            <button className="dark-button" onClick={() => changeQty(article, 1)} disabled={quantity >= article.stock}>Ajouter au panier</button>
          </div>
          <button className="detail-cart-link" onClick={onGoCart}>Panier : {cartCount} article{cartCount > 1 ? "s" : ""}</button>
        </div>
      </div>
    </div>
  );
}
