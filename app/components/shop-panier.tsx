"use client";

import { useEffect, useState } from "react";
import { createOrder, formatPrice, getSessionUser, saveGuestOrderId, type GuestCustomer } from "../lib/store";
import { useCart } from "./shop-shell";
import { apiFetch } from "../lib/api";
import { faCheck, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";
import { discountedUnitPrice, isPromotionInDateRange } from "../lib/promotions";

export function Panier({ onReturnHome }: { onReturnHome: () => void }) {
  const { cart, cartLines, cartTotal, changeQty, clearCart, promotionSlug } = useCart();
  const discountTotal = cartLines.reduce((discount, article) => {
    if (!article.promotion || !isPromotionInDateRange(article.promotion) || article.promotion.discountPercent <= 0) return discount;
    const discountPercent = Math.max(0, Math.min(100, article.promotion.discountPercent));
    const discountedPrice = discountedUnitPrice(article.prix, discountPercent);
    return discount + (article.prix - discountedPrice) * (cart[article.id] ?? 0);
  }, 0);
  const orderTotal = Math.max(0, cartTotal - discountTotal);
  const appliedPromotionNames = [...new Set(cartLines
    .filter((article) => article.promotion && isPromotionInDateRange(article.promotion) && article.promotion.discountPercent > 0)
    .map((article) => article.promotion?.title ?? article.promotion?.slug ?? "")
    .filter(Boolean))];
  const [session, setSession] = useState<ReturnType<typeof getSessionUser>>(null);
  const [hydrated, setHydrated] = useState(false);
  const logged = !!session && session.role === "client";
  const [guest, setGuest] = useState<GuestCustomer>({ nom: "", prenom: "", email: "", telephone: "", adresse: "" });
  const [guestError, setGuestError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [clientTelephone, setClientTelephone] = useState("");
  const [successReference, setSuccessReference] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSession(getSessionUser());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!successReference) return;
    const timer = window.setTimeout(onReturnHome, 3000);
    return () => window.clearTimeout(timer);
  }, [onReturnHome, successReference]);

  if (successReference) {
    return (
      <div className="view-content order-success-stage">
        <section className="order-confirmation" aria-labelledby="order-success-title" aria-describedby="order-success-description">
          <span className="order-confirmation-success-icon"><Icon icon={faCheck} /></span>
          <h2 id="order-success-title">Commande confirmée !</h2>
          <p id="order-success-description" className="muted-label">Votre commande a été enregistrée avec succès.</p>
          <strong className="order-number">{successReference}</strong>
          <p className="order-confirmation-hint">Redirection vers l’accueil dans quelques instants…</p>
          <button className="dark-button" onClick={onReturnHome}>Retourner à l’accueil</button>
        </section>
      </div>
    );
  }

  async function order() {
    if (cartLines.length === 0) return;
    const s = getSessionUser();
    if (s?.role === "client") {
      if (clientTelephone.trim().length < 5 || clientTelephone.trim().length > 30) {
        setOrderError("Veuillez saisir un numéro de téléphone valide (5 à 30 caractères).");
        return;
      }
      const items = cartLines.map((a) => ({ articleId: a.id, quantite: cart[a.id] ?? 0 }));
      setSubmitting(true);
      setOrderError("");
      try {
        const data = await apiFetch<{ order: { reference: string; subtotal?: number; discountTotal?: number; total?: number } }>("/api/orders", {
          method: "POST",
          body: JSON.stringify({ items, promotionSlug, nom: s.username, prenom: s.username, email: s.email, telephone: clientTelephone.trim(), adresse: "Adresse du compte" }),
        });
        createOrder(s, cartLines.map((a) => ({ article: a, quantite: cart[a.id] ?? 0 })), {
          reference: data.order.reference,
          promotionSlug,
          subtotal: data.order.subtotal,
          discountTotal: data.order.discountTotal,
          total: data.order.total,
          telephone: clientTelephone.trim(),
        });
        clearCart();
        setSuccessReference(data.order.reference);
      } catch (reason) {
        setOrderError(reason instanceof Error ? reason.message : "La commande n’a pas pu être enregistrée. Réessayez.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (Object.values(guest).some((value) => !value.trim())) {
      setGuestError("Veuillez renseigner tous les champs pour recevoir votre commande.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(guest.email)) {
      setGuestError("Veuillez saisir une adresse email valide.");
      return;
    }
    try {
      setSubmitting(true);
      setGuestError("");
      const data = await apiFetch<{ order: { reference: string; subtotal?: number; discountTotal?: number; total?: number } }>("/api/orders/guest", {
        method: "POST",
        body: JSON.stringify({
          items: cartLines.map((article) => ({ articleId: article.id, quantite: cart[article.id] ?? 0 })),
          promotionSlug,
          ...guest,
        }),
      });
      const orderCreated = createOrder(guest, cartLines.map((article) => ({ article, quantite: cart[article.id] ?? 0 })), {
        reference: data.order.reference,
        promotionSlug,
        subtotal: data.order.subtotal,
        discountTotal: data.order.discountTotal,
        total: data.order.total,
      });
      saveGuestOrderId(orderCreated.id);
      clearCart();
      setGuestError("");
      setSuccessReference(data.order.reference);
    } catch (reason) {
      setGuestError(reason instanceof Error ? reason.message : "La commande n’a pas pu être enregistrée. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="view-content">
      <div className="page-heading"><div><p className="eyebrow">PANIER</p><h1>Mon panier</h1></div></div>
      {cartLines.length === 0 ? (
        <p className="muted-label">Votre panier est vide.</p>
      ) : (
        <div className="panel" style={{ padding: 18 }}>
          <ul className="cart-list">
            {cartLines.map((a) => (
              <li key={a.id}>
                <span>{a.nom} x{cart[a.id]}</span>
                <span className="suggestion-actions">
                  <button className="outline-button" onClick={() => changeQty(a, -1)} aria-label={`Retirer ${a.nom}`}><Icon icon={faMinus} /></button>
                  <button className="outline-button" onClick={() => changeQty(a, 1)} aria-label={`Ajouter ${a.nom}`}><Icon icon={faPlus} /></button>
                  {a.promotion && isPromotionInDateRange(a.promotion) && a.promotion.discountPercent > 0 ? (
                    <span className="cart-promo-price">
                      <del>{formatPrice(a.prix * (cart[a.id] ?? 0))}</del>
                      <strong>{formatPrice(discountedUnitPrice(a.prix, a.promotion.discountPercent) * (cart[a.id] ?? 0))}</strong>
                    </span>
                  ) : <strong>{formatPrice(a.prix * (cart[a.id] ?? 0))}</strong>}
                </span>
              </li>
            ))}
          </ul>
          <div className="cart-totals">
            <p>Sous-total <strong>{formatPrice(cartTotal)}</strong></p>
            {discountTotal > 0 && <p className="cart-discount-row">Réductions {appliedPromotionNames.length > 0 && <span>({appliedPromotionNames.join(", ")})</span>} <strong>− {formatPrice(discountTotal)}</strong></p>}
            <p className="cart-grand-total">Total à payer <strong>{formatPrice(orderTotal)}</strong></p>
          </div>
          {hydrated && logged ? (
            <div className="guest-order">
              <label className="login-field">
                <span>Téléphone de contact</span>
                <input type="tel" autoComplete="tel" value={clientTelephone} onChange={(event) => setClientTelephone(event.target.value)} placeholder="+216 XX XXX XXX" />
              </label>
              {orderError && <p className="login-error" role="alert">{orderError}</p>}
              <button className="dark-button" onClick={order} disabled={submitting}>{submitting ? "Enregistrement..." : "Passer commande"}</button>
            </div>
          ) : hydrated ? (
            <div className="guest-order">
              <p><strong>Vos coordonnées de livraison</strong></p>
              <div className="guest-form">
                {(["prenom", "nom", "email", "telephone"] as const).map((field) => (
                  <input key={field} type={field === "email" ? "email" : field === "telephone" ? "tel" : "text"} placeholder={field === "prenom" ? "Prénom" : field === "nom" ? "Nom" : field === "email" ? "Email" : "Téléphone"} value={guest[field]} onChange={(event) => setGuest({ ...guest, [field]: event.target.value })} />
                ))}
                <input type="text" placeholder="Adresse de livraison" value={guest.adresse} onChange={(event) => setGuest({ ...guest, adresse: event.target.value })} />
              </div>
              {guestError && <p className="login-error">{guestError}</p>}
              <button className="dark-button" onClick={order} disabled={submitting}>{submitting ? "Enregistrement..." : "Passer commande sans compte"}</button>
            </div>
          ) : <p className="muted-label">Chargement de votre session…</p>}
        </div>
      )}
    </div>
  );
}
