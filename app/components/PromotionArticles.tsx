"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Article } from "../interfaces/Article";
import { apiFetch } from "../lib/api";
import { discountedUnitPrice, isPromotionInDateRange } from "../lib/promotions";
import { formatPrice } from "../lib/store";

type ArticlePage = {
  articles: Article[];
  pagination: { totalPages: number };
};

export function PromotionArticles({ slug }: { slug: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadArticles() {
      try {
        const firstPage = await apiFetch<ArticlePage>(`/api/articles?promotion=${encodeURIComponent(slug)}&page=1&pageSize=24`);
        const remainingPages = await Promise.all(
          Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
            apiFetch<ArticlePage>(`/api/articles?promotion=${encodeURIComponent(slug)}&page=${index + 2}&pageSize=24`),
          ),
        );
        if (active) setArticles([...firstPage.articles, ...remainingPages.flatMap((page) => page.articles)]);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Impossible de charger les articles de cette promotion.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadArticles();
    return () => { active = false; };
  }, [slug]);

  const groupedArticles = articles.reduce<Map<string, Article[]>>((groups, article) => {
    const categoryArticles = groups.get(article.categorie) ?? [];
    categoryArticles.push(article);
    groups.set(article.categorie, categoryArticles);
    return groups;
  }, new Map());
  const categories = [...groupedArticles.keys()].sort((first, second) => first.localeCompare(second, "fr"));

  return (
    <section className="promotion-articles" aria-labelledby="promotion-articles-heading">
      <div className="catalogue-category-heading">
        <div><h2 id="promotion-articles-heading">Articles de cette promotion</h2></div>
        {!loading && !error && <span>{articles.length} article{articles.length === 1 ? "" : "s"}</span>}
      </div>
      {loading ? <p className="support-empty muted-label">Chargement des articles…</p>
        : error ? <p className="login-error" role="alert">{error}</p>
          : articles.length === 0 ? <p className="support-empty muted-label">Aucun article n’est associé à cette promotion.</p>
            : categories.map((category) => (
              <section className="catalogue-category-group" key={category}>
                <div className="catalogue-category-heading"><h3>{category}</h3><span>{groupedArticles.get(category)?.length ?? 0} article(s)</span></div>
                <div className="workflow-grid">
                  {groupedArticles.get(category)?.map((article) => {
                    const promotion = article.promotion && isPromotionInDateRange(article.promotion) ? article.promotion : null;
                    return (
                      <article className="workflow-card promotion-product-card" key={article.id}>
                        {article.image && <img className="catalogue-image" src={article.image} alt={article.nom} />}
                        <span className="workflow-tag">{article.categorie}</span>
                        <h3>{article.nom}</h3>
                        <p className="heading-sub">{article.description}</p>
                        <p className="promotion-product-price">
                          {promotion && promotion.discountPercent > 0
                            ? <><del>{formatPrice(article.prix)}</del><strong>{formatPrice(discountedUnitPrice(article.prix, promotion.discountPercent))}</strong><span className="product-discount-badge">-{promotion.discountPercent}%</span></>
                            : <strong>{formatPrice(article.prix)}</strong>}
                        </p>
                        <Link className="product-detail-link" href={`/?promotion=${encodeURIComponent(slug)}#catalogue-products`}>Voir dans la boutique</Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
    </section>
  );
}
