"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder, formatPrice, getSessionUser, saveGuestOrderId, type GuestCustomer } from "../lib/store";
import { useCart } from "./shop-shell";
import { apiFetch } from "../lib/api";

export function Panier({ goCommandes }: { goCommandes: () => void }) {
  const router = useRouter();
  const { cart, cartLines, cartTotal, changeQty, clearCart } = useCart();
  const [session, setSession] = useState<ReturnType<typeof getSessionUser>>(null);
  const [hydrated, setHydrated] = useState(false);
  const logged = !!session && session.role === "client";
  const [guest, setGuest] = useState<GuestCustomer>({ nom: "", prenom: "", email: "", telephone: "", adresse: "" });
  const [guestError, setGuestError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSession(getSessionUser());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function order() {
    if (cartLines.length === 0) return;
    const s = getSessionUser();
    if (s?.role === "client") {
      const items = cartLines.map((a) => ({ articleId: a.id, quantite: cart[a.id] ?? 0 }));
      const data = await apiFetch<{ order: { reference: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ items, nom: s.username, prenom: s.username, email: s.email, telephone: "0000000000", adresse: "Adresse du compte" }),
      });
      createOrder(s, cartLines.map((a) => ({ article: a, quantite: cart[a.id] ?? 0 })), data.order.reference);
      clearCart();
      goCommandes();
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
    const orderCreated = createOrder(guest, cartLines.map((a) => ({ article: a, quantite: cart[a.id] ?? 0 })));
    saveGuestOrderId(orderCreated.id);
    clearCart();
    setGuestError("");
    router.push("/");
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
                  <button className="outline-button" onClick={() => changeQty(a, -1)}>−</button>
                  <button className="outline-button" onClick={() => changeQty(a, 1)}>+</button>
                  <strong>{formatPrice(a.prix * (cart[a.id] ?? 0))}</strong>
                </span>
              </li>
            ))}
          </ul>
          <p><strong>Total : {formatPrice(cartTotal)}</strong></p>
          {hydrated && logged ? <button className="dark-button" onClick={order}>Passer commande</button> : hydrated ? (
            <div className="guest-order">
              <p><strong>Vos coordonnées de livraison</strong></p>
              <div className="guest-form">
                {(["prenom", "nom", "email", "telephone"] as const).map((field) => (
                  <input key={field} type={field === "email" ? "email" : field === "telephone" ? "tel" : "text"} placeholder={field === "prenom" ? "Prénom" : field === "nom" ? "Nom" : field === "email" ? "Email" : "Téléphone"} value={guest[field]} onChange={(event) => setGuest({ ...guest, [field]: event.target.value })} />
                ))}
                <input type="text" placeholder="Adresse de livraison" value={guest.adresse} onChange={(event) => setGuest({ ...guest, adresse: event.target.value })} />
              </div>
              {guestError && <p className="login-error">{guestError}</p>}
              <button className="dark-button" onClick={order}>Passer commande sans compte</button>
            </div>
          ) : <p className="muted-label">Chargement de votre session…</p>}
        </div>
      )}
    </div>
  );
}
