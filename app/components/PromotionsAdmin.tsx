"use client";

import { useEffect, useState, type FormEvent } from "react";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../lib/api";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";

type PromotionRecord = {
  id: string;
  slug: string;
  title: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type PromotionForm = Pick<PromotionRecord, "title" | "discountPercent" | "startDate" | "endDate">;

const emptyForm: PromotionForm = {
  title: "",
  discountPercent: 0,
  startDate: "",
  endDate: "",
};

export function PromotionsAdmin() {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [promotionToDelete, setPromotionToDelete] = useState<PromotionRecord | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch<{ promotions: PromotionRecord[] }>("/api/promotions/admin")
      .then((data) => {
        if (!active) return;
        setPromotions(data.promotions);
        setApiReady(true);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setApiReady(false);
        setError(reason instanceof Error ? reason.message : "API de promotions indisponible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
  }

  function editPromotion(promotion: PromotionRecord) {
    setEditingId(promotion.id);
    setForm({
      title: promotion.title,
      discountPercent: promotion.discountPercent,
      startDate: promotion.startDate.slice(0, 10),
      endDate: promotion.endDate.slice(0, 10),
    });
    setError("");
    setSuccess("");
  }

  async function savePromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiReady) return;
    if (form.endDate < form.startDate) {
      setError("La date de fin doit être égale ou postérieure à la date de début.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch<{ promotion: PromotionRecord }>(
        editingId ? `/api/promotions/${editingId}` : "/api/promotions",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({ ...form, discountPercent: Number(form.discountPercent) }),
        },
      );
      setPromotions((current) => editingId
        ? current.map((promotion) => promotion.id === editingId ? data.promotion : promotion)
        : [data.promotion, ...current]);
      setSuccess(editingId ? "La promotion a été modifiée." : "La promotion a été créée.");
      setEditingId(null);
      setForm(emptyForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement de la promotion impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePromotion(promotion: PromotionRecord) {
    try {
      await apiFetch(`/api/promotions/${promotion.id}`, { method: "DELETE" });
      setPromotions((current) => current.filter((item) => item.id !== promotion.id));
      if (editingId === promotion.id) resetForm();
      setSuccess("La promotion a été supprimée.");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression de la promotion impossible.");
    }
  }

  async function setPromotionActive(promotion: PromotionRecord, isActive: boolean) {
    setTogglingId(promotion.id);
    setError("");
    setSuccess("");
    try {
      const data = await apiFetch<{ promotion: PromotionRecord }>(`/api/promotions/${promotion.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
      setPromotions((current) => current.map((item) => item.id === promotion.id ? data.promotion : item));
      setSuccess(isActive ? "La promotion a été activée." : "La promotion a été désactivée.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Modification de l’état impossible.");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="view-content knowledge-workspace promotions-admin">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BOUTIQUE</p>
          <h1>Promotions</h1>
          <p className="heading-sub">Définissez un titre, une remise et sa période de validité.</p>
        </div>
        <span className={`promotion-api-status${apiReady ? " connected" : ""}`}>
          <i /> {apiReady ? "API connectée" : "Backend à connecter"}
        </span>
      </div>

      {error && <p className="login-error" role="alert">{error}</p>}
      {success && <p className="promotion-success" role="status">{success}</p>}

      <div className="promotions-admin-layout">
        <section className="panel promotions-admin-list">
          <div className="list-header">
            <strong>Promotions existantes</strong>
            <span className="muted-label">{promotions.length}</span>
          </div>
          {loading ? <p className="support-empty muted-label">Chargement des promotions…</p> : promotions.length === 0 ? <p className="support-empty muted-label">Aucune promotion créée.</p> : (
            <div className="crud-table promotion-crud-table">
              <div className="crud-table-head"><span>Titre</span><span>Remise</span><span>Période</span><span>Activée</span><span>Actions</span></div>
              {promotions.map((promotion) => (
                <article className="crud-table-row" key={promotion.id}>
                  <strong>{promotion.title}</strong>
                  <span className="promotion-admin-discount">-{promotion.discountPercent}%</span>
                  <span>{formatDate(promotion.startDate)} – {formatDate(promotion.endDate)}</span>
                  <label className="promotion-active-checkbox">
                    <input
                      type="checkbox"
                      checked={promotion.isActive}
                      disabled={!apiReady || togglingId === promotion.id}
                      onChange={(event) => void setPromotionActive(promotion, event.target.checked)}
                      aria-label={`${promotion.isActive ? "Désactiver" : "Activer"} ${promotion.title}`}
                    />
                    <span>{promotion.isActive ? getPromotionState(promotion).label : "Désactivée"}</span>
                  </label>
                  <div className="knowledge-actions">
                    <button className="icon-button" type="button" onClick={() => editPromotion(promotion)} aria-label={`Modifier ${promotion.title}`} title="Modifier"><Icon icon={faPen} /></button>
                    <button className="icon-button danger-button" type="button" onClick={() => setPromotionToDelete(promotion)} aria-label={`Supprimer ${promotion.title}`} title="Supprimer"><Icon icon={faTrash} /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form className="panel knowledge-form promotion-form" onSubmit={savePromotion}>
          <div className="list-header">
            <strong>{editingId ? "Modifier la promotion" : "Nouvelle promotion"}</strong>
            {editingId && <button className="outline-button" type="button" onClick={resetForm}>Annuler</button>}
          </div>
          <label className="login-field">
            <span>Titre</span>
            <input required maxLength={120} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex. Offre de saison" />
          </label>
          <label className="login-field">
            <span>Remise (%)</span>
            <input required type="number" min={0} max={100} value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: Number(event.target.value) }))} />
          </label>
          <div className="promotion-form-row promotion-date-row">
            <label className="login-field">
              <span>Date de début</span>
              <input required type="date" value={form.startDate} max={form.endDate || undefined} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
            </label>
            <label className="login-field">
              <span>Date de fin</span>
              <input required type="date" value={form.endDate} min={form.startDate || undefined} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
            </label>
          </div>
          <button className="dark-button" type="submit" disabled={!apiReady || saving}>
            {saving ? "Enregistrement…" : !apiReady ? "En attente de l’API backend" : editingId ? "Enregistrer les modifications" : "Créer la promotion"}
          </button>
        </form>
      </div>
      {promotionToDelete && (
        <ConfirmDialog
          title="Supprimer cette promotion ?"
          description={`« ${promotionToDelete.title} » sera supprimée définitivement.`}
          onCancel={() => setPromotionToDelete(null)}
          onConfirm={() => { const promotion = promotionToDelete; setPromotionToDelete(null); void deletePromotion(promotion); }}
        />
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");
}

function getPromotionState(promotion: PromotionRecord) {
  if (!promotion.isActive) return { label: "Désactivée", className: "inactive" };
  const today = new Date().toISOString().slice(0, 10);
  if (promotion.endDate.slice(0, 10) < today) return { label: "Expirée", className: "expired" };
  if (promotion.startDate.slice(0, 10) > today) return { label: "À venir", className: "upcoming" };

  return { label: `Active · -${promotion.discountPercent}%`, className: "active" };
}
