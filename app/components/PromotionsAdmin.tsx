"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { faArrowUpRightFromSquare, faPen, faTag, faTrash } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "../lib/api";
import { promotions as fallbackPromotions } from "../lib/promotions";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";

type PromotionRecord = {
  id?: string;
  slug: string;
  discountPercent: number;
  badge: string;
  kicker: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  detailTitle: string;
  detailDescription: string;
  highlights: readonly string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

type PromotionForm = Omit<PromotionRecord, "id" | "highlights" | "startDate" | "endDate" | "isActive"> & {
  highlights: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const emptyForm: PromotionForm = {
  slug: "",
  discountPercent: 0,
  badge: "",
  kicker: "",
  title: "",
  description: "",
  image: "",
  imageAlt: "",
  detailTitle: "",
  detailDescription: "",
  highlights: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

export function PromotionsAdmin() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([...fallbackPromotions]);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [usingFallback, setUsingFallback] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [promotionToDelete, setPromotionToDelete] = useState<PromotionRecord | null>(null);

  useEffect(() => {
    let active = true;

    apiFetch<{ promotions: PromotionRecord[] }>("/api/promotions/admin")
      .then((data) => {
        if (!active) return;
        setPromotions(data.promotions);
        setApiReady(true);
        setUsingFallback(false);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setApiReady(false);
        setUsingFallback(true);
        setError(reason instanceof Error ? reason.message : "API de promotions indisponible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  function updateField<K extends keyof PromotionForm>(field: K, value: PromotionForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "title" ? { slug: createSlug(String(value)) } : {}),
    }));
  }

  function editPromotion(promotion: PromotionRecord) {
    if (!promotion.id) return;
    setEditingId(promotion.id);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setForm({
      slug: promotion.slug,
      discountPercent: promotion.discountPercent,
      badge: promotion.badge,
      kicker: promotion.kicker,
      title: promotion.title,
      description: promotion.description,
      image: promotion.image,
      imageAlt: promotion.imageAlt,
      detailTitle: promotion.detailTitle,
      detailDescription: promotion.detailDescription,
      highlights: promotion.highlights.join("\n"),
      startDate: promotion.startDate?.slice(0, 10) ?? "",
      endDate: promotion.endDate?.slice(0, 10) ?? "",
      isActive: promotion.isActive !== false,
    });
    setError("");
    setSuccess("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setError("");
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Choisissez une image PNG, JPG, WebP ou GIF.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("L’image doit faire moins de 6 Mo.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      if (typeof imageData !== "string") {
        setError("Impossible de lire cette image. Essayez un autre fichier.");
        return;
      }
      setForm((current) => ({ ...current, image: imageData }));
      setError("");
    };
    reader.onerror = () => setError("Impossible de lire cette image. Essayez un autre fichier.");
    reader.readAsDataURL(file);
  }

  async function savePromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiReady) return;
    if (!form.image) {
      setError("Sélectionnez une image depuis votre ordinateur.");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("La date de fin doit être égale ou postérieure à la date de début.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      discountPercent: Number(form.discountPercent),
      highlights: form.highlights.split(/\r?\n/).map((highlight) => highlight.trim()).filter(Boolean),
    };

    try {
      const data = await apiFetch<{ promotion: PromotionRecord }>(editingId ? `/api/promotions/${editingId}` : "/api/promotions", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
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
    if (!promotion.id) return;
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

  return (
    <div className="view-content knowledge-workspace promotions-admin">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BOUTIQUE</p>
          <h1>Promotions</h1>
          <p className="heading-sub">Créez les offres mises en avant dans la boutique.</p>
        </div>
        <span className={`promotion-api-status${apiReady ? " connected" : ""}`}>
          <i /> {apiReady ? "API connectée" : "Backend à connecter"}
        </span>
      </div>

      {error && <p className="login-error" role="alert">{usingFallback ? "L’API promotions n’est pas encore disponible. " : ""}{error}</p>}
      {success && <p className="promotion-success" role="status">{success}</p>}

      <div className="promotions-admin-layout">
        <section className="panel promotions-admin-list">
          <div className="list-header">
            <strong>Offres existantes</strong>
            <span className="muted-label">{promotions.length}</span>
          </div>
          {usingFallback && <p className="promotions-fallback-note">Aperçu des offres actuellement intégrées au site. Elles seront chargées depuis l’API dès qu’elle sera disponible.</p>}
          {loading ? <p className="support-empty muted-label">Chargement des promotions…</p> : promotions.length === 0 ? <p className="support-empty muted-label">Aucune promotion créée.</p> : (
            <div className="promotions-admin-grid">
              {promotions.map((promotion) => (
                  <article className="promotion-admin-card" key={promotion.id ?? promotion.slug}>
                  <img src={promotion.image} alt={promotion.imageAlt} />
                  <div className="promotion-admin-card-copy">
                    <span className="promotion-admin-badge"><Icon icon={faTag} /> {promotion.badge}</span>
                    <h2>{promotion.title}</h2>
                    <p>{promotion.description}</p>
                    <p className="promotion-admin-dates">{formatDate(promotion.startDate)} – {formatDate(promotion.endDate)}</p>
                    <div className="promotion-admin-card-footer">
                      <span className={`promotion-state ${getPromotionState(promotion).className}`}>{getPromotionState(promotion).label}</span>
                      <div className="promotion-card-actions">
                        <Link href={`/promotions/${promotion.slug}`} aria-label={`Prévisualiser ${promotion.title}`} title="Prévisualiser"><Icon icon={faArrowUpRightFromSquare} /></Link>
                        <button type="button" onClick={() => editPromotion(promotion)} disabled={!apiReady || !promotion.id} aria-label={`Modifier ${promotion.title}`} title="Modifier"><Icon icon={faPen} /></button>
                        <button type="button" className="danger-button" onClick={() => setPromotionToDelete(promotion)} disabled={!apiReady || !promotion.id} aria-label={`Supprimer ${promotion.title}`} title="Supprimer"><Icon icon={faTrash} /></button>
                      </div>
                    </div>
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
          <label className="login-field"><span>Titre</span><input required maxLength={120} value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Ex. Les détails qui changent tout" /></label>
          <label className="login-field"><span>Slug public</span><input required maxLength={140} value={form.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="genere-depuis-le-titre" /></label>
          <div className="promotion-form-row">
            <label className="login-field"><span>Remise (%)</span><input required type="number" min={0} max={100} value={form.discountPercent} onChange={(event) => updateField("discountPercent", Number(event.target.value))} /></label>
            <label className="login-field"><span>Badge</span><input required maxLength={40} value={form.badge} onChange={(event) => updateField("badge", event.target.value)} placeholder="JUSQU’À -30%" /></label>
          </div>
          <div className="promotion-form-row promotion-date-row">
            <label className="login-field"><span>Date de début</span><input required type="date" value={form.startDate} max={form.endDate || undefined} onChange={(event) => updateField("startDate", event.target.value)} /></label>
            <label className="login-field"><span>Date de fin</span><input required type="date" value={form.endDate} min={form.startDate || undefined} onChange={(event) => updateField("endDate", event.target.value)} /></label>
          </div>
          <label className="promotion-active-toggle"><input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} /><span>Promotion active</span></label>
          <label className="login-field"><span>Accroche</span><input required maxLength={100} value={form.kicker} onChange={(event) => updateField("kicker", event.target.value)} placeholder="LA PETITE TOUCHE EN PLUS" /></label>
          <label className="login-field"><span>Description courte</span><textarea required maxLength={500} className="knowledge-content-input promotion-short-description" value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label>
          <label className="login-field">
            <span>Image de la promotion</span>
            <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" required={!form.image} onChange={(event) => selectImage(event.target.files?.[0])} />
            <small className="muted-label">PNG, JPG, WebP ou GIF — 6 Mo maximum. Laissez vide lors d’une modification pour conserver l’image actuelle.</small>
          </label>
          {form.image && <img className="article-image-preview" src={form.image} alt="Aperçu de l’image de la promotion" />}
          <label className="login-field"><span>Texte alternatif de l’image</span><input required maxLength={180} value={form.imageAlt} onChange={(event) => updateField("imageAlt", event.target.value)} /></label>
          <label className="login-field"><span>Titre de la page offre</span><input required maxLength={140} value={form.detailTitle} onChange={(event) => updateField("detailTitle", event.target.value)} /></label>
          <label className="login-field"><span>Description de la page offre</span><textarea required maxLength={2000} className="knowledge-content-input" value={form.detailDescription} onChange={(event) => updateField("detailDescription", event.target.value)} /></label>
          <label className="login-field"><span>Points forts (un par ligne)</span><textarea required className="knowledge-content-input promotion-highlights" value={form.highlights} onChange={(event) => updateField("highlights", event.target.value)} placeholder={"Une offre à durée limitée\nDes accessoires choisis avec soin"} /></label>
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

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value: string | undefined) {
  if (!value) return "Date non définie";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");
}

function getPromotionState(promotion: PromotionRecord) {
  if (promotion.isActive === false) return { label: "Désactivée", className: "inactive" };

  const today = new Date().toISOString().slice(0, 10);
  if (promotion.endDate && promotion.endDate.slice(0, 10) < today) return { label: "Expirée", className: "expired" };
  if (promotion.startDate && promotion.startDate.slice(0, 10) > today) return { label: "À venir", className: "upcoming" };

  return {
    label: promotion.discountPercent > 0 ? `Active · -${promotion.discountPercent}%` : "Active · sans remise",
    className: "active",
  };
}