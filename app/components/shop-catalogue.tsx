"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatPrice } from "../lib/store";
import { discountedUnitPrice, isPromotionInDateRange } from "../lib/promotions";
import type { Article } from "../interfaces/Article";
import { apiFetch } from "../lib/api";
import { useCart } from "./shop-shell";
import { PromoSection } from "./PromoSection";
import { faArrowRightLong, faCheck, faChevronDown, faLayerGroup, faMagnifyingGlass, faMinus, faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";

export function Catalogue({ onGoCart, onOpenArticle }: { onGoCart: () => void; onOpenArticle: (article: Article) => void }) {
  const [visibleArticles, setVisibleArticles] = useState<Article[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const categoryFieldRef = useRef<HTMLDivElement>(null);
  const { cart, changeQty, cartCount, updateArticles, promotionSlug, setPromotionSlug } = useCart();
  const categoryOptions = ["", ...categories];
  const selectedCategoryIndex = Math.max(0, categoryOptions.indexOf(category));
  const groupedArticles = visibleArticles.reduce<Map<string, Article[]>>((groups, article) => {
    const group = groups.get(article.categorie) ?? [];
    group.push(article);
    groups.set(article.categorie, group);
    return groups;
  }, new Map());
  const sortedGroups = Array.from(groupedArticles.entries()).sort(([first], [second]) => {
    const firstIndex = categories.indexOf(first);
    const secondIndex = categories.indexOf(second);
    if (firstIndex === -1 && secondIndex === -1) return first.localeCompare(second, "fr");
    if (firstIndex === -1) return 1;
    if (secondIndex === -1) return -1;
    return firstIndex - secondIndex;
  });

  function showArticles() {
    setPage(1);
    setQuery("");
    setCategory("");
    setCategoryOpen(false);
    document.getElementById("catalogue-products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectCategory(value: string) {
    setPage(1);
    setCategory(value);
    setActiveCategoryIndex(Math.max(0, categoryOptions.indexOf(value)));
    setCategoryOpen(false);
  }

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      setCategoryOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!categoryOpen) {
        setActiveCategoryIndex(selectedCategoryIndex);
        setCategoryOpen(true);
      } else {
        setActiveCategoryIndex((index) => (index + direction + categoryOptions.length) % categoryOptions.length);
      }
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setCategoryOpen(true);
      setActiveCategoryIndex(event.key === "Home" ? 0 : categoryOptions.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!categoryOpen) {
        setActiveCategoryIndex(selectedCategoryIndex);
        setCategoryOpen(true);
      } else {
        selectCategory(categoryOptions[activeCategoryIndex] ?? "");
      }
    }
  }

  useEffect(() => {
    if (!categoryOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !categoryFieldRef.current?.contains(event.target)) {
        setCategoryOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [categoryOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apiFetch<{ articles: Article[]; pagination: { totalPages: number } }>(`/api/articles?page=${page}&pageSize=6${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}${category ? `&categorie=${encodeURIComponent(category)}` : ""}${promotionSlug ? `&promotion=${encodeURIComponent(promotionSlug)}` : ""}`)
        .then((data) => { setVisibleArticles(data.articles); updateArticles(data.articles); setTotalPages(data.pagination.totalPages || 1); })
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [page, query, category, promotionSlug, updateArticles]);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("promotion");
    setPromotionSlug(slug);
  }, [setPromotionSlug]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apiFetch<{ categories: { nom: string }[] }>("/api/categories")
        .then((data) => setCategories(data.categories.map((item) => item.nom)))
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>(".product-card");
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("product-card-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("product-card-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

    cards.forEach((card) => {
      card.classList.add("product-card-reveal");
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, [visibleArticles]);

  return (
    <div className="view-content">
      <PromoSection onExplore={showArticles} />
      <div className="page-heading">
        <div>
          <p className="eyebrow">{promotionSlug ? "SÉLECTION PROMOTIONNELLE" : "BOUTIQUE"}</p>
          <h1>Articles</h1>
          <p className="heading-sub">{promotionSlug ? "Les articles éligibles à cette offre sont signalés avec leur prix remisé." : "Catalogue public — connectez-vous pour commander avec suivi."}</p>
        </div>
        <div className="heading-actions">
          {promotionSlug && <button className="outline-button" onClick={() => { setPromotionSlug(null); window.history.replaceState(null, "", "/#catalogue-products"); }}><Icon icon={faXmark} /> Voir tout le catalogue</button>}
          <button className="outline-button" onClick={onGoCart}>Voir le panier ({cartCount})</button>
        </div>
      </div>
      <div id="catalogue-products" className="knowledge-toolbar shop-catalogue-toolbar">
        <label className="catalogue-search-field">
          <Icon icon={faMagnifyingGlass} />
          <input className="knowledge-search" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Rechercher un article..." aria-label="Rechercher un article" />
        </label>
        <div className={`catalogue-category-field${categoryOpen ? " open" : ""}`} ref={categoryFieldRef}>
          <Icon icon={faLayerGroup} />
          <button
            className="catalogue-category-trigger"
            type="button"
            role="combobox"
            aria-label="Filtrer par catégorie"
            aria-haspopup="listbox"
            aria-expanded={categoryOpen}
            aria-controls="catalogue-category-options"
            aria-activedescendant={categoryOpen ? `catalogue-category-option-${activeCategoryIndex}` : undefined}
            onClick={() => {
              if (!categoryOpen) setActiveCategoryIndex(selectedCategoryIndex);
              setCategoryOpen((open) => !open);
            }}
            onKeyDown={handleCategoryKeyDown}
          >
            <span>{category || "Toutes les catégories"}</span>
            <Icon icon={faChevronDown} />
          </button>
          {categoryOpen && (
            <div className="category-options" id="catalogue-category-options" role="listbox" aria-label="Catégories">
              {categoryOptions.map((item, index) => (
                <div
                  className={`category-option${index === activeCategoryIndex ? " is-active" : ""}`}
                  id={`catalogue-category-option-${index}`}
                  key={item || "all-categories"}
                  role="option"
                  aria-selected={category === item}
                  onMouseEnter={() => setActiveCategoryIndex(index)}
                  onClick={() => selectCategory(item)}
                >
                  <span className="category-option-mark"><Icon icon={faLayerGroup} /></span>
                  <span className="category-option-label">{item || "Toutes les catégories"}</span>
                  {category === item && <Icon icon={faCheck} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {sortedGroups.length === 0 ? (
        <p className="catalogue-empty muted-label">Aucun article trouvé pour cette recherche.</p>
      ) : sortedGroups.map(([groupName, articlesInGroup]) => (
        <section className="catalogue-category-group" key={groupName} aria-labelledby={`category-${groupName.replace(/\s+/g, "-")}`}>
          <div className="catalogue-category-heading">
            <div><span className="catalogue-category-mark"><Icon icon={faLayerGroup} /></span><h2 id={`category-${groupName.replace(/\s+/g, "-")}`}>{groupName}</h2></div>
            <span>{articlesInGroup.length} article{articlesInGroup.length > 1 ? "s" : ""}</span>
          </div>
          <div className="workflow-grid">
            {articlesInGroup.map((a) => (
              <article className={`workflow-card product-card${a.image ? " product-card-with-image" : ""}`} key={a.id} onClick={() => onOpenArticle(a)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpenArticle(a); }} role="button" tabIndex={0}>
                {a.image && <img className="catalogue-image" src={a.image} alt={a.nom} />}
                <span className="workflow-tag">{a.categorie}</span>
                <h2>{a.nom}</h2>
                <p className="heading-sub">{a.description}</p>
                <p>
                  {a.promotion && isPromotionInDateRange(a.promotion) && a.promotion.discountPercent > 0 ? (
                    <><del className="product-original-price">{formatPrice(a.prix)}</del> <strong>{formatPrice(discountedUnitPrice(a.prix, a.promotion.discountPercent))}</strong> <span className="product-discount-badge">-{a.promotion.discountPercent}%</span></>
                  ) : <strong>{formatPrice(a.prix)}</strong>}
                  {" "}<span className="muted-label">Stock : {a.stock}</span>
                </p>
                <div className="suggestion-actions" onClick={(event) => event.stopPropagation()}>
                  <button className="outline-button" onClick={() => changeQty(a, -1)} aria-label={`Retirer ${a.nom}`}><Icon icon={faMinus} /></button>
                  <strong>{cart[a.id] ?? 0}</strong>
                  <button className="outline-button" onClick={() => changeQty(a, 1)} aria-label={`Ajouter ${a.nom}`}><Icon icon={faPlus} /></button>
                </div>
                <button className="product-detail-link" onClick={(event) => { event.stopPropagation(); onOpenArticle(a); }}>Voir le détail <Icon icon={faArrowRightLong} /></button>
              </article>
            ))}
          </div>
        </section>
      ))}
      <div className="pagination-controls"><button className="outline-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Précédent</button><span className="muted-label">Page {page} sur {totalPages}</span><button className="outline-button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Suivant</button></div>
    </div>
  );
}
