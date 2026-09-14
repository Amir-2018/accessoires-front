"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { formatPrice, getOrders, getSessionUser, type SessionUser } from "../lib/store";
import { ORDER_STATUS_LABELS } from "../interfaces/Order";
import { apiFetch } from "../lib/api";

function RequireClient({ title, eyebrow, goLogin, children }: { title: string; eyebrow: string; goLogin: () => void; children: (user: SessionUser) => ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUser(getSessionUser());
      setChecked(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!checked) return <p>Chargement…</p>;
  if (!user || user.role !== "client") {
    return (
      <div className="view-content">
        <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div></div>
        <div className="panel" style={{ padding: 22 }}>
          <p>Connectez-vous avec un compte client pour voir cette page.</p>
          <button className="dark-button" onClick={goLogin}>Se connecter</button>
        </div>
      </div>
    );
  }
  return <>{children(user)}</>;
}

export function MesCommandes({ goLogin }: { goLogin: () => void }) {
  return (
    <RequireClient title="Mes commandes" eyebrow="SUIVI" goLogin={goLogin}>
      {(user) => {
        const orders = getOrders("client", user.id);
        return (
          <div className="view-content">
            <div className="page-heading"><div><p className="eyebrow">SUIVI</p><h1>Mes commandes</h1></div></div>
            <div className="panel order-table-panel">
              <table className="order-table">
                <thead><tr><th>N°</th><th>Articles</th><th>Total</th><th>Statut</th><th>Date</th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={5} className="muted-label">Aucune commande.</td></tr>}
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.id}</strong></td>
                      <td>{o.items.map((i) => `${i.nom} x${i.quantite}`).join(", ")}</td>
                      <td>{formatPrice(o.total)}</td>
                      <td><span className="status-pill status-in-progress">{ORDER_STATUS_LABELS[o.status]}</span></td>
                      <td>{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    </RequireClient>
  );
}

export function ClientMessages({ goLogin, selectedId }: { goLogin: () => void; selectedId: string | null }) {
  return (
    <RequireClient title="Messages" eyebrow="DISCUSSION" goLogin={goLogin}>
      {(user) => <Thread userId={user.id} selectedId={selectedId} />}
    </RequireClient>
  );
}

function Thread({ userId, selectedId }: { userId: string; selectedId: string | null }) {
  type Conversation = { id: string; messages: { id: string; authorRole: string; authorNom: string; text: string; createdAt: string }[]; order?: { reference: string; status: string }; drafts: { status: string }[] };
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadConversations() {
      try {
        const { conversations: loaded } = await apiFetch<{ conversations: Conversation[] }>("/api/conversations");
        if (!active) return;
        setConversations(loaded);
        const matching = loaded.find((conversation) => conversation.order?.reference === selectedId);
        setSelectedConversation((current) => current && loaded.some((conversation) => conversation.id === current) ? current : matching?.id ?? loaded[0]?.id ?? null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadConversations();
    const timer = window.setInterval(() => void loadConversations(), 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selectedId, userId]);

  const selected = conversations.find((conversation) => conversation.id === selectedConversation) ?? null;

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    const data = await apiFetch<{ message: Conversation["messages"][number] }>(`/api/conversations/${selected.id}/messages`, { method: "POST", body: JSON.stringify({ text: draft }) });
    setConversations((current) => current.map((conversation) => conversation.id === selected.id ? { ...conversation, messages: [...conversation.messages, data.message] } : conversation));
    setDraft("");
  }

  if (loading) return <div className="view-content"><p className="muted-label">Chargement des messages…</p></div>;
  if (conversations.length === 0) {
    return <div className="view-content"><div className="page-heading"><div><p className="eyebrow">DISCUSSION</p><h1>Messages</h1></div></div><p className="muted-label">Aucune commande.</p></div>;
  }

  return (
    <div className="view-content">
      <div className="page-heading"><div><p className="eyebrow">DISCUSSION</p><h1>Messages de mes commandes</h1></div></div>
      <div className="thread-layout">
        <div className="panel thread-list">
          {conversations.map((conversation) => (
            <button key={conversation.id} className={`thread-item ${selectedConversation === conversation.id ? "active" : ""}`} onClick={() => setSelectedConversation(conversation.id)}>
              <strong>{conversation.order?.reference ?? "Demande support"}</strong>
              <span className="muted-label">{conversation.messages.length} message(s)</span>
            </button>
          ))}
        </div>
        <div className="panel thread-panel">
          <div className="panel-header"><strong>{selected?.order?.reference ?? "Demande support"}</strong></div>
          <div className="thread-messages">
            {selected?.messages.map((m) => (
              <div key={m.id} className={`message ${m.authorRole === "client" ? "outgoing" : "incoming"}`}>
                <span>{m.authorNom} · {new Date(m.createdAt).toLocaleString("fr-FR")}</span>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form className="thread-form" onSubmit={send}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ecrire au service client…" aria-label="Votre message" />
            <button type="submit" className="dark-button" disabled={!draft.trim()}>Envoyer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
