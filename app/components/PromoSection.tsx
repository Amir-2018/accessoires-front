"use client";

import { useEffect, useState } from "react";
import { faArrowRightLong, faChevronLeft, faChevronRight, faPause, faPlay, faTag } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { Icon } from "./Icon";
import { apiFetch } from "../lib/api";
import type { Promotion } from "../interfaces/Promotion";

export function PromoSection({ onExplore }: { onExplore: () => void }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activePromotion, setActivePromotion] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [loadError, setLoadError] = useState("");
  const promotion = promotions[activePromotion];

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
          <h2 id="promo-title">Les offres qui font briller votre style</h2>
          <p className="heading-sub promo-heading-sub">Vos accessoires préférés, à prix doux.</p>
        </div>
        <button className="outline-button promo-all-button" onClick={onExplore}>
          Voir tous les articles <Icon icon={faArrowRightLong} />
        </button>
      </div>
      {loadError ? <p className="login-error" role="alert">{loadError}</p> : promotions.length === 0 ? <p className="support-empty muted-label">Aucune promotion active aujourd’hui. Vérifiez les dates de validité dans l’espace superviseur.</p> : <div
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
          <img className="promo-slide-image" src={promotion.image} alt={promotion.imageAlt} />
          <div className="promo-slide-content">
            <span className="promo-badge"><Icon icon={faTag} /> {promotion.badge}</span>
            <p className="promo-kicker">{promotion.kicker}</p>
            <h3>{promotion.title}</h3>
            <p className="promo-description">{promotion.description}</p>
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
