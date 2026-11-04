"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { faPen, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";

type Client = { id: string; username: string; email: string; createdAt: string };
type ClientForm = { username: string; email: string; password: string };
type ClientPage = { clients: Client[]; pagination: { totalPages: number } };
const emptyForm: ClientForm = { username: "", email: "", password: "" };

export function ClientsAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [confirmEdit, setConfirmEdit] = useState(false);

  async function loadClients() {
    setLoading(true);
    try {
      const data = await apiFetch<ClientPage>(`/api/clients?page=${page}&pageSize=8${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`);
      setClients(data.clients);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadClients(), 0);
    return () => window.clearTimeout(timer);
  }, [page, query]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function editClient(client: Client) {
    setEditingId(client.id);
    setForm({ username: client.username, email: client.email, password: "" });
    setError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (editingId) {
      setConfirmEdit(true);
      return;
    }

    await persistClient();
  }

  async function persistClient() {
    setSaving(true);
    setError("");
    try {
      const body = editingId && !form.password ? { username: form.username, email: form.email } : form;
      await apiFetch(editingId ? `/api/clients/${editingId}` : "/api/clients", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) });
      resetForm();
      await loadClients();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(client: Client) {
    try {
      await apiFetch(`/api/clients/${client.id}`, { method: "DELETE" });
      await loadClients();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    }
  }

  return <div className="view-content knowledge-workspace">
    <div className="page-heading"><div><p className="eyebrow">CLIENTS</p><h1>Clients</h1><p className="heading-sub">Créez, modifiez et gérez les comptes clients.</p></div><button className="dark-button" onClick={resetForm}><Icon icon={faPlus} /> Nouveau client</button></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="knowledge-toolbar"><input className="knowledge-search" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder="Rechercher un client..." aria-label="Rechercher un client" /></div>
    <div className="knowledge-layout">
      <section className="panel knowledge-list crud-table"><div className="list-header"><strong>Comptes clients</strong><span className="muted-label">Page {page} / {totalPages}</span></div><div className="crud-table-head"><span>Client</span><span>Email</span><span>Inscription</span><span>Actions</span></div>{loading ? <p className="support-empty muted-label">Chargement...</p> : clients.length === 0 ? <p className="support-empty muted-label">Aucun client trouvé.</p> : clients.map((client) => <article className="knowledge-item crud-table-row" key={client.id}><strong>{client.username}</strong><span>{client.email}</span><span>{new Date(client.createdAt).toLocaleDateString("fr-FR")}</span><div className="knowledge-actions"><button className="icon-button" onClick={() => editClient(client)} aria-label={`Modifier ${client.username}`} title="Modifier"><Icon icon={faPen} /></button><button className="icon-button danger-button" onClick={() => setClientToDelete(client)} aria-label={`Supprimer ${client.username}`} title="Supprimer"><Icon icon={faTrash} /></button></div></article>)}</section>
      <form className="panel knowledge-form" onSubmit={save}><div className="list-header"><strong>{editingId ? "Modifier le client" : "Créer un client"}</strong>{editingId && <button type="button" className="outline-button" onClick={resetForm}>Annuler</button>}</div><label className="login-field"><span>Nom d’utilisateur</span><input required minLength={2} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label><label className="login-field"><span>Email</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="login-field"><span>{editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}</span><input required={!editingId} minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button className="dark-button" type="submit" disabled={saving}>{saving ? "Enregistrement..." : editingId ? "Enregistrer" : "Créer le client"}</button></form>
    </div>
    <div className="pagination-controls"><button className="outline-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Précédent</button><span className="muted-label">Page {page} sur {totalPages}</span><button className="outline-button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Suivant</button></div>
    {confirmEdit && <ConfirmDialog title="Confirmer la modification ?" description={`Les modifications apportées au compte « ${form.username} » seront enregistrées.`} variant="primary" confirmLabel="Enregistrer" onCancel={() => setConfirmEdit(false)} onConfirm={() => { setConfirmEdit(false); void persistClient(); }} />}
    {clientToDelete && <ConfirmDialog title="Supprimer ce client ?" description={`Le compte « ${clientToDelete.username} » sera supprimé définitivement.`} onCancel={() => setClientToDelete(null)} onConfirm={() => { const client = clientToDelete; setClientToDelete(null); void remove(client); }} />}
  </div>;
}
