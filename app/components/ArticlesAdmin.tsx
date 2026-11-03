"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import type { Article } from "../interfaces/Article";
import { faPen, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";

type ArticleForm = Omit<Article, "id" | "promotion"> & { promotionId: string };

const emptyArticle: ArticleForm = { nom: "", image: "", description: "", prix: 0, stock: 0, categorie: "", promotionId: "" };

type ArticlePage = { articles: Article[]; pagination: { page: number; total: number; totalPages: number } };
type Category = { id: string; nom: string };
type PromotionOption = { id: string; slug: string; title: string; discountPercent: number; startDate: string; endDate: string; isActive: boolean };

export function ArticlesAdmin() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState<ArticleForm>(emptyArticle);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<PromotionOption[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);

  async function loadArticles() {
    setLoading(true);
    try {
      const data = await apiFetch<ArticlePage>(`/api/articles?page=${page}&pageSize=6${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`);
      setArticles(data.articles);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les articles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArticles(), 0);
    return () => window.clearTimeout(timer);
  }, [page, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      apiFetch<{ categories: Category[] }>("/api/categories").then((data) => setCategories(data.categories)).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    apiFetch<{ promotions: PromotionOption[] }>("/api/promotions")
      .then((data) => setPromotions(data.promotions.filter((promotion) => promotion.isActive)))
      .catch(() => setPromotions([]));
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyArticle);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setSelectedImageFile(null);
    setImagePreview("");
  }

  function editArticle(article: Article) {
    setEditingId(article.id);
    setForm({ nom: article.nom, image: article.image, description: article.description, prix: article.prix, stock: article.stock, categorie: article.categorie, promotionId: article.promotion?.id ?? "" });
    setSelectedImageFile(null);
    setImagePreview(article.image);
    setError("");
  }

  function selectImage(file: File | undefined) {
    if (!file) {
      setError("Veuillez sélectionner une image.");
      return;
    }
    const imageExtension = /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name);
    if (!file.type.startsWith("image/") && !imageExtension) {
      setError("Veuillez sélectionner un fichier image valide.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("L’image doit faire moins de 6 Mo.");
      return;
    }
    setError("");
    setSelectedImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, image: String(reader.result) }));
    reader.onerror = () => setError("Impossible de lire cette image. Essayez un autre fichier.");
    reader.readAsDataURL(file);
  }

  function readImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Impossible de lire cette image."));
      reader.readAsDataURL(file);
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let image = form.image;
      const selectedFile = selectedImageFile ?? imageInputRef.current?.files?.[0];
      if (selectedFile) {
        const imageExtension = /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(selectedFile.name);
        if (!selectedFile.type.startsWith("image/") && !imageExtension) throw new Error("Veuillez sélectionner un fichier image valide.");
        if (selectedFile.size > 6 * 1024 * 1024) throw new Error("L’image doit faire moins de 6 Mo.");
        image = await readImage(selectedFile);
      }
      const articleData = { ...form, image, prix: Number(form.prix), stock: Number(form.stock), promotionId: form.promotionId || null };
      const body = editingId ? articleData : { id: crypto.randomUUID(), ...articleData };
      await apiFetch(editingId ? `/api/articles/${editingId}` : "/api/articles", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) });
      resetForm();
      await loadArticles();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(article: Article) {
    try {
      await apiFetch(`/api/articles/${article.id}`, { method: "DELETE" });
      await loadArticles();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    }
  }

  return <div className="view-content knowledge-workspace">
    <div className="page-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Articles</h1><p className="heading-sub">Gérez les produits visibles dans la boutique.</p></div><button className="dark-button" onClick={resetForm}><Icon icon={faPlus} /> Nouvel article</button></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="knowledge-toolbar"><input className="knowledge-search" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Rechercher un article..." aria-label="Rechercher un article" /></div>
    <div className="knowledge-layout">
      <section className="panel knowledge-list crud-table"><div className="list-header"><strong>Catalogue</strong><span className="muted-label">Page {page} / {totalPages}</span></div><div className="crud-table-head"><span>Article</span><span>Catégorie</span><span>Prix</span><span>Stock</span><span>Actions</span></div>{loading ? <p className="support-empty muted-label">Chargement...</p> : articles.length === 0 ? <p className="support-empty muted-label">Aucun article trouvé.</p> : articles.map((article) => <article className="knowledge-item crud-table-row" key={article.id}><div className="crud-primary">{article.image && <img src={article.image} alt="" />}<strong>{article.nom}</strong></div><span>{article.categorie}</span><span>{article.prix} DT</span><span>{article.stock}</span><div className="knowledge-actions"><button className="icon-button" onClick={() => editArticle(article)} aria-label={`Modifier ${article.nom}`} title="Modifier"><Icon icon={faPen} /></button><button className="icon-button danger-button" onClick={() => setArticleToDelete(article)} aria-label={`Supprimer ${article.nom}`} title="Supprimer"><Icon icon={faTrash} /></button></div></article>)}</section>
      <form className="panel knowledge-form" onSubmit={save}>
        <div className="list-header">
          <strong>{editingId ? "Modifier l'article" : "Créer un article"}</strong>
          {editingId && <button type="button" className="outline-button" onClick={resetForm}>Annuler</button>}
        </div>
        <label className="login-field">
          <span>Nom</span>
          <input required value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} />
        </label>
        <label className="login-field">
          <span>Catégorie</span>
          <select required value={form.categorie} onChange={(event) => setForm({ ...form, categorie: event.target.value })}>
            <option value="">Sélectionner une catégorie</option>
            {categories.map((category) => <option key={category.id} value={category.nom}>{category.nom}</option>)}
          </select>
        </label>
        <label className="login-field">
          <span>Promotion</span>
          <select value={form.promotionId} onChange={(event) => setForm({ ...form, promotionId: event.target.value })}>
            <option value="">Aucune promotion</option>
            {promotions.map((promotion) => <option key={promotion.id} value={promotion.id}>{promotion.title} (-{promotion.discountPercent} %)</option>)}
          </select>
          {promotions.length === 0 && <small className="muted-label">Aucune promotion active disponible.</small>}
        </label>
        <label className="login-field">
          <span>Image</span>
          <input ref={imageInputRef} type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif" onChange={(event) => selectImage(event.target.files?.[0])} />
          {(imagePreview || form.image) ? <img className="article-image-preview" src={imagePreview || form.image} alt="Aperçu de l’article" /> : <small className="muted-label">Aucune image sélectionnée.</small>}
        </label>
        <label className="login-field">
          <span>Description</span>
          <textarea required minLength={3} className="knowledge-content-input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <div className="guest-form">
          <label className="login-field">
            <span>Prix</span>
            <input required min={0} type="number" value={form.prix} onChange={(event) => setForm({ ...form, prix: Number(event.target.value) })} />
          </label>
          <label className="login-field">
            <span>Stock</span>
            <input required min={0} type="number" value={form.stock} onChange={(event) => setForm({ ...form, stock: Number(event.target.value) })} />
          </label>
        </div>
        <button className="dark-button" type="submit" disabled={saving || categories.length === 0}>
          {saving ? "Enregistrement..." : categories.length === 0 ? "Créez d’abord une catégorie" : editingId ? "Enregistrer" : "Créer l’article"}
        </button>
      </form>
    </div>
    <div className="pagination-controls"><button className="outline-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Précédent</button><span className="muted-label">Page {page} sur {totalPages}</span><button className="outline-button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Suivant</button></div>
    {articleToDelete && <ConfirmDialog title="Supprimer cet article ?" description={`« ${articleToDelete.nom} » sera supprimé définitivement du catalogue.`} onCancel={() => setArticleToDelete(null)} onConfirm={() => { const article = articleToDelete; setArticleToDelete(null); void remove(article); }} />}
  </div>;
}
