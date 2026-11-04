"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";

type FaqStatus = "brouillon" | "publie";
type FaqArticle = { id: string; title: string; category: string; content: string; status: FaqStatus; version: number; updatedAt: string };
type FaqForm = { title: string; category: string; content: string; status: FaqStatus };

const emptyForm: FaqForm = { title: "", category: "", content: "", status: "brouillon" };

export function KnowledgeBase() {
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tous" | FaqStatus>("tous");
  const [categoryFilter, setCategoryFilter] = useState("toutes");
  const [form, setForm] = useState<FaqForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [articleToDelete, setArticleToDelete] = useState<FaqArticle | null>(null);
  const [confirmEdit, setConfirmEdit] = useState(false);

  async function loadArticles(search = query) {
    setLoading(true);
    try {
      const data = await apiFetch<{ articles: FaqArticle[] }>(`/api/conversations/knowledge/articles${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
      setArticles(data.articles);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les FAQ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArticles(), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const categories = Array.from(new Set(articles.map((article) => article.category))).sort();
  const visibleArticles = articles.filter((article) => (statusFilter === "tous" || article.status === statusFilter) && (categoryFilter === "toutes" || article.category === categoryFilter));

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function startEdit(article: FaqArticle) {
    setEditingId(article.id);
    setForm({ title: article.title, category: article.category, content: article.content, status: article.status });
    setError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      setConfirmEdit(true);
      return;
    }

    await persistArticle();
  }

  async function persistArticle() {
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await apiFetch(`/api/conversations/knowledge/articles/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await apiFetch("/api/conversations/knowledge/articles", { method: "POST", body: JSON.stringify(form) });
      }
      startCreate();
      await loadArticles();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(article: FaqArticle) {
    try {
      await apiFetch(`/api/conversations/knowledge/articles/${article.id}`, { method: "DELETE" });
      await loadArticles();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    }
  }

  return <div className="view-content knowledge-workspace">
    <div className="page-heading"><div><p className="eyebrow">BASE DE CONNAISSANCES</p><h1>FAQ</h1><p className="heading-sub">Réponses validées, catégories organisées et recherche sémantique.</p></div><button className="dark-button" onClick={startCreate}>Nouvelle FAQ</button></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="knowledge-toolbar">
      <input className="knowledge-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une réponse, un thème..." aria-label="Recherche sémantique dans les FAQ" />
      <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrer par catégorie"><option value="toutes">Toutes les catégories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
      <div className="knowledge-status-tabs"><button className={statusFilter === "tous" ? "active" : ""} onClick={() => setStatusFilter("tous")}>Toutes</button><button className={statusFilter === "publie" ? "active" : ""} onClick={() => setStatusFilter("publie")}>Publiées</button><button className={statusFilter === "brouillon" ? "active" : ""} onClick={() => setStatusFilter("brouillon")}>Brouillons</button></div>
    </div>
    <div className="knowledge-layout">
      <section className="panel knowledge-list"><div className="list-header"><strong>Articles FAQ</strong><span className="muted-label">{visibleArticles.length}</span></div>{loading ? <p className="support-empty muted-label">Chargement…</p> : visibleArticles.length === 0 ? <p className="support-empty muted-label">Aucune FAQ trouvée.</p> : visibleArticles.map((article) => <article className="knowledge-item" key={article.id}><div className="knowledge-item-top"><span className="workflow-tag">{article.category}</span><span className={`status-pill ${article.status === "publie" ? "status-resolved" : "status-pending"}`}>{article.status}</span></div><h2>{article.title}</h2><p>{article.content}</p><small className="muted-label">Version {article.version} · {new Date(article.updatedAt).toLocaleDateString("fr-FR")}</small><div className="knowledge-actions"><button className="outline-button" onClick={() => startEdit(article)}>Modifier</button><button className="outline-button danger-button" onClick={() => setArticleToDelete(article)}>Supprimer</button></div></article>)}</section>
      <form className="panel knowledge-form" onSubmit={save}><div className="list-header"><strong>{editingId ? "Modifier la FAQ" : "Créer une FAQ"}</strong>{editingId && <button type="button" className="outline-button" onClick={startCreate}>Annuler</button>}</div><label className="login-field"><span>Question ou titre</span><input required minLength={2} maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Comment suivre une commande ?" /></label><label className="login-field"><span>Catégorie</span><input required minLength={2} maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Livraison" /></label><label className="login-field"><span>Réponse</span><textarea required minLength={10} maxLength={10000} className="knowledge-content-input" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Rédigez la réponse de référence..." /></label><label className="login-field"><span>État</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FaqStatus })}><option value="brouillon">Brouillon</option><option value="publie">Publié</option></select></label><button className="dark-button" type="submit" disabled={saving}>{saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Créer la FAQ"}</button></form>
    </div>
    {confirmEdit && <ConfirmDialog title="Confirmer la modification ?" description={`Les modifications apportées à « ${form.title} » seront enregistrées.`} variant="primary" confirmLabel="Enregistrer" onCancel={() => setConfirmEdit(false)} onConfirm={() => { setConfirmEdit(false); void persistArticle(); }} />}
    {articleToDelete && <ConfirmDialog title="Supprimer cette FAQ ?" description={`« ${articleToDelete.title} » sera supprimée définitivement.`} onCancel={() => setArticleToDelete(null)} onConfirm={() => { const article = articleToDelete; setArticleToDelete(null); void remove(article); }} />}
  </div>;
}
