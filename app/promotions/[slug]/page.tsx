import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { faArrowLeft, faArrowRightLong, faCheck, faTag } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "../../components/Icon";
import { getPromotion } from "../../lib/promotion-api";

type PromotionPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PromotionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const promotion = await getPromotion(slug);

  return {
    title: promotion ? `${promotion.title} | Ouou Accessoires` : "Offre introuvable | Ouou Accessoires",
    description: promotion?.detailDescription,
  };
}

export default async function PromotionPage({ params }: PromotionPageProps) {
  const { slug } = await params;
  const promotion = await getPromotion(slug);

  if (!promotion) notFound();

  return (
    <main className="app-shell promo-detail-page">
      <header className="promo-detail-nav">
        <Link className="topbar-brand topbar-brand-link" href="/">
          <img className="brand-logo-nav" src="/logo.jpg" alt="" /> Ouou Accessoires
        </Link>
        <Link className="outline-button" href="/#catalogue-products">Voir la boutique</Link>
      </header>
      <div className="promo-detail-content">
        <Link className="back-link promo-detail-back" href="/">
          <Icon icon={faArrowLeft} /> Retour à la boutique
        </Link>
        <section className="promo-detail-hero">
          <img src={promotion.image} alt={promotion.imageAlt} />
          <div className="promo-detail-hero-shade" />
          <div className="promo-detail-hero-copy">
            <span className="promo-badge"><Icon icon={faTag} /> {promotion.badge}</span>
            <p className="promo-kicker">{promotion.kicker}</p>
            <h1>{promotion.title}</h1>
          </div>
        </section>
        <section className="promo-detail-info">
          <div>
            <p className="eyebrow">L&apos;OFFRE OUOU</p>
            <h2>{promotion.detailTitle}</h2>
            <p className="promo-detail-description">{promotion.detailDescription}</p>
          </div>
          <div className="promo-detail-highlights">
            <h3>À découvrir</h3>
            <ul>
              {promotion.highlights.map((highlight) => (
                <li key={highlight}><Icon icon={faCheck} /> {highlight}</li>
              ))}
            </ul>
            <Link className="promo-cta promo-detail-cta" href={`/?promotion=${promotion.slug}#catalogue-products`}>
              {promotion.discountPercent > 0 ? "Choisir les articles de l’offre" : "Découvrir les articles"} <Icon icon={faArrowRightLong} />
            </Link>
          </div>
        </section>
      </div>
      <footer className="shop-footer">
        <div className="shop-footer-inner">
          <div className="shop-footer-brand">
            <img className="shop-footer-mark" src="/logo.jpg" alt="" />
            <div><strong>OUOU ACCESSOIRES</strong><span>Les détails qui font votre style.</span></div>
          </div>
          <p className="shop-footer-copyright">© {new Date().getFullYear()} Ouou Accessoires. Tous droits réservés.</p>
        </div>
      </footer>
    </main>
  );
}
