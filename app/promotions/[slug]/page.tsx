import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { faArrowLeft, faArrowRightLong, faTag } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "../../components/Icon";
import { PromotionArticles } from "../../components/PromotionArticles";
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
    description: promotion ? `${promotion.discountPercent}% de remise, du ${formatDate(promotion.startDate)} au ${formatDate(promotion.endDate)}.` : undefined,
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
          <div className="promo-detail-hero-shade" />
          <div className="promo-detail-hero-copy">
            <span className="promo-badge"><Icon icon={faTag} /> Offre du {formatDate(promotion.startDate)} au {formatDate(promotion.endDate)}</span>
            <h1>{promotion.title}</h1>
          </div>
        </section>
        <section className="promo-detail-info">
          <div>
            <p className="eyebrow">L&apos;OFFRE OUOU</p>
            <h2>-{promotion.discountPercent}%</h2>
            <p className="promo-detail-description">Remise applicable aux articles associés à cette promotion pendant sa période de validité.</p>
            <Link className="promo-cta promo-detail-cta" href={`/?promotion=${promotion.slug}#catalogue-products`}>
              Choisir les articles de l’offre <Icon icon={faArrowRightLong} />
            </Link>
          </div>
        </section>
        <PromotionArticles slug={promotion.slug} />
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

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");
}
