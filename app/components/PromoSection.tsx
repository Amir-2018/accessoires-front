"use client";

import { useEffect, useState } from "react";
import { faArrowRightLong, faChevronLeft, faChevronRight, faPause, faPlay, faTag } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { Icon } from "./Icon";
import { apiFetch } from "../lib/api";
import type { Article } from "../interfaces/Article";
import type { Promotion } from "../interfaces/Promotion";

type PromotionProducts = {
  slug: string;
  images: { id: string; src: string }[];
  error?: string;
};

type ArticlePage = {
  articles: Article[];
  pagination: { totalPages: number };
};

export function PromoSection({ onExplore }: { onExplore: () => void }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activePromotion, setActivePromotion] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [loadError, setLoadError] = useState("");
  const promotion = promotions[activePromotion];
  const [promotionProducts, setPromotionProducts] = useState<PromotionProducts | null>(null);
  const [promotionImageSelection, setPromotionImageSelection] = useState<{ slug: string; index: number } | null>(null);
  const promotionSlug = promotion?.slug;
  const currentPromotionProducts = promotionProducts?.slug === promotionSlug ? promotionProducts : null;
  const promotionImages = currentPromotionProducts?.images ?? [];
  const promotionImageIndex = promotionImageSelection && promotionImageSelection.slug === promotionSlug && promotionImageSelection.index < promotionImages.length
    ? promotionImageSelection.index
    : 0;
  const currentPromotionImage = promotionImages[promotionImageIndex];
  const displayedPromotionImages = currentPromotionImage
    ? promotionImages.length > 1
      ? [promotionImages[(promotionImageIndex - 1 + promotionImages.length) % promotionImages.length], currentPromotionImage]
      : [currentPromotionImage]
    : [];

  useEffect(() => {
    let active = true;
    apiFetch<{ promotions: Promotion[] }>("/api/promotions")
      .then((data) => {
        if (!active) return;
        setPromotions(data.promotions);
        setLoadError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setPromotions([]);
        setLoadError(reason instanceof Error ? reason.message : "Chargement des promotions impossible.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!promotionSlug) return;

    let active = true;
    async function loadPromotionImages() {
      try {
        const firstPage = await apiFetch<ArticlePage>(`/api/articles?promotion=${encodeURIComponent(promotionSlug)}&page=1&pageSize=24`);
        const remainingPages = await Promise.all(
          Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
            apiFetch<ArticlePage>(`/api/articles?promotion=${encodeURIComponent(promotionSlug)}&page=${index + 2}&pageSize=24`),
          ),
        );
        if (active) {
          setPromotionProducts({
            slug: promotionSlug,
            images: [...firstPage.articles, ...remainingPages.flatMap((page) => page.articles)]
              .filter((article) => article.image)
              .map((article) => ({ id: article.id, src: article.image })),
          });
        }
      } catch (reason: unknown) {
        if (!active) return;
        setPromotionProducts({
          slug: promotionSlug,
          images: [],
          error: reason instanceof Error ? reason.message : "Impossible de charger les images des articles en promotion.",
        });
      }
    }

    void loadPromotionImages();

    return () => { active = false; };
  }, [promotionSlug]);

  useEffect(() => {
    if (prefersReducedMotion || promotionImages.length < 2 || !promotionSlug) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setPromotionImageSelection({ slug: promotionSlug, index: (promotionImageIndex + 1) % promotionImages.length });
      }
    }, 3600);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, promotionImageIndex, promotionImages.length, promotionSlug]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (isPaused || isHovered || isFocused || prefersReducedMotion || promotions.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActivePromotion((index) => (index + 1) % promotions.length);
      }
    }, 5200);
    return () => window.clearInterval(timer);
  }, [activePromotion, isFocused, isHovered, isPaused, prefersReducedMotion, promotions.length]);

  function navigate(offset: number) {
    setActivePromotion((index) => (index + offset + promotions.length) % promotions.length);
  }

  return (
    <section className="promo-section" aria-labelledby="promo-title">
      <div className="promo-heading">
        <div>
          <p className="eyebrow promo-eyebrow">LES BONS PLANS OUOU</p>
          <h2 id="promo-title">Bienvenue ouou Accessoires </h2>
          <p className="heading-sub promo-heading-sub">Profitez de nos offres en cours.</p>
        </div>
        <button className="outline-button promo-all-button" onClick={onExplore}>
          Voir tous les articles <Icon icon={faArrowRightLong} />
        </button>
      </div>Aucune promotion active aujourd’hui. Vérifiez les dates de validité dans l’espace superviseur
      {loadError ? <p className="login-error" role="alert">{loadError}</p> : promotions.length === 0 ? <p className="support-empty muted-label">.</p> : <div
        className="promo-carousel"
        data-paused={isPaused || isHovered || isFocused || prefersReducedMotion}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false);
        }}
        role="region"
        aria-roledescription="carrousel"
        aria-label="Promotions à découvrir"
      >
        <article
          key={promotion.title}
          className="promo-slide"
          aria-roledescription="diapositive"
          aria-label={`Promotion ${activePromotion + 1} sur ${promotions.length}`}
        >
          {displayedPromotionImages.map((image) => (
            <img
              key={image.id}
              className={`promo-slide-image${image.id === currentPromotionImage?.id ? " is-active" : ""}`}
              src={image.src}
              alt=""
              aria-hidden="true"
            />
          ))}
          <div className="promo-slide-content">
            <span className="promo-badge"><Icon icon={faTag} /> Offre valable du {formatDate(promotion.startDate)} au {formatDate(promotion.endDate)}</span>
            <h3>{promotion.title}</h3>
            <p className="promo-description">-{promotion.discountPercent}% sur les articles associés à cette promotion.</p>
            {currentPromotionProducts?.error && <span className="promo-slide-products-error" role="status">{currentPromotionProducts.error}</span>}
            <Link className="promo-cta" href={`/promotions/${promotion.slug}`}>
              Découvrir l&apos;offre <Icon icon={faArrowRightLong} />
            </Link>
          </div>
          <span className="promo-slide-count" aria-hidden="true">
            {String(activePromotion + 1).padStart(2, "0")} <span>/ {String(promotions.length).padStart(2, "0")}</span>
          </span>
        </article>
        <div className="promo-controls">
          <div className="promo-dots" role="group" aria-label="Choisir une promotion">
            {promotions.map((item, index) => (
              <button
                key={item.title}
                className={`promo-dot${index === activePromotion ? " active" : ""}`}
                onClick={() => setActivePromotion(index)}
                aria-label={`Afficher la promotion ${index + 1} : ${item.title}`}
                aria-pressed={index === activePromotion}
              ><span className="promo-dot-progress" aria-hidden="true" /></button>
            ))}
          </div>
          <div className="promo-arrows">
            {!prefersReducedMotion && (
              <button
                className="promo-toggle"
                onClick={() => setIsPaused((paused) => !paused)}
                aria-label={isPaused ? "Reprendre le carrousel" : "Mettre le carrousel en pause"}
                title={isPaused ? "Reprendre le carrousel" : "Mettre le carrousel en pause"}
                aria-pressed={isPaused}
              >
                <Icon icon={isPaused ? faPlay : faPause} />
              </button>
            )}
            <button className="promo-arrow" onClick={() => navigate(-1)} aria-label="Promotion précédente">
              <Icon icon={faChevronLeft} />
            </button>
            <button className="promo-arrow" onClick={() => navigate(1)} aria-label="Promotion suivante">
              <Icon icon={faChevronRight} />
            </button>
          </div>
        </div>
      </div>}
    </section>
  );
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");
}
