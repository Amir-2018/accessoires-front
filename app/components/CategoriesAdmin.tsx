"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";

type Category = { id: string; nom: string };

export function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await apiFetch<{ categories: Category[] }>("/api/categories");
      setCategories(data.categories);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les catégories.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch("/api/categories", { method: "POST", body: JSON.stringify({ nom: name }) });
      setName("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Création impossible.");
    }
  }

  async function rename(category: Category) {
    if (!editingName.trim()) return;
    try {
      await apiFetch(`/api/categories/${category.id}`, { method: "PATCH", body: JSON.stringify({ nom: editingName }) });
      setEditingId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Modification impossible.");
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Supprimer la catégorie « ${category.nom} » ?`)) return;
    try {
      await apiFetch(`/api/categories/${category.id}`, { method: "DELETE" });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    }
  }

  return <div className="view-content knowledge-workspace">
    <div className="page-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Catégories</h1><p className="heading-sub">Créez les catégories disponibles pour les articles.</p></div></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="knowledge-layout">
      <section className="panel knowledge-list crud-table category-list"><div className="list-header"><strong>Catégories</strong><span className="muted-label">{categories.length}</span></div><div className="crud-table-head"><span>Nom</span><span>Actions</span></div>{categories.map((category) => <article className="knowledge-item crud-table-row" key={category.id}>{editingId === category.id ? <div className="category-edit"><input value={editingName} onChange={(event) => setEditingName(event.target.value)} /><button className="dark-button" onClick={() => void rename(category)}>Enregistrer</button><button className="outline-button" onClick={() => setEditingId(null)}>Annuler</button></div> : <><strong>{category.nom}</strong><div className="knowledge-actions"><button className="icon-button" onClick={() => { setEditingId(category.id); setEditingName(category.nom); }} aria-label={`Modifier ${category.nom}`} title="Modifier"><Icon icon={faPen} /></button><button className="icon-button danger-button" onClick={() => void remove(category)} aria-label={`Supprimer ${category.nom}`} title="Supprimer"><Icon icon={faTrash} /></button></div></>}</article>)}</section>
      <form className="panel knowledge-form" onSubmit={create}><div className="list-header"><strong>Créer une catégorie</strong></div><label className="login-field"><span>Nom de la catégorie</span><input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Robes" /></label><button className="dark-button" type="submit">Créer la catégorie</button></form>
    </div>
  </div>;
}
