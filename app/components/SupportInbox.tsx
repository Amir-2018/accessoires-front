"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/store";

type Source = { id: string; title: string; category: string; excerpt: string };
type Draft = { id: string; generatedText: string; editedText?: string | null; status: string; confidence: number; model: string; sources: Source[] };
type Conversation = { id: string; status: string; priority: string; sentiment?: string; intent?: string; urgencyScore: number; customer?: { username: string; email: string }; messages: { id: string; authorRole: string; authorNom: string; text: string }[]; drafts: Draft[]; order?: { reference: string; status: string; total: number; items: { nom: string; prix: number; quantite: number }[] } };

export function SupportInbox({ supervisor = false, escalatedOnly = false }: { supervisor?: boolean; escalatedOnly?: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editedText, setEditedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function loadInbox() {
    setLoading(true);
    try {
      const data = await apiFetch<{ conversations: Conversation[] }>(`/api/conversations${escalatedOnly ? "?status=escalade" : ""}`);
      setConversations(data.conversations);
      if (selected) {
        const refreshed = data.conversations.find((item) => item.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger l'inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(id: string) {
    try {
      const data = await apiFetch<{ conversation: Conversation }>(`/api/conversations/${id}`);
      setSelected(data.conversation);
      setDraft(data.conversation.drafts[0] ?? null);
      setEditedText(data.conversation.drafts[0]?.editedText ?? data.conversation.drafts[0]?.generatedText ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger la conversation.");
    }
  }

  useEffect(() => { const initialLoad = window.setTimeout(() => void loadInbox(), 0); const timer = window.setInterval(() => void loadInbox(), 10000); return () => { window.clearTimeout(initialLoad); window.clearInterval(timer); }; }, []);

  async function generateDraft() {
    if (!selected) return;
    setWorking(true); setError("");
    try {
      const data = await apiFetch<{ draft: Draft }>(`/api/conversations/${selected.id}/ai-draft`, { method: "POST" });
      setDraft(data.draft); setEditedText(data.draft.generatedText); await openConversation(selected.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Génération impossible."); } finally { setWorking(false); }
  }

  async function editDraft() {
    if (!selected || !draft) return;
    setWorking(true);
    try { const data = await apiFetch<{ draft: Draft }>(`/api/conversations/${selected.id}/drafts/${draft.id}`, { method: "PATCH", body: JSON.stringify({ editedText }) }); setDraft(data.draft); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Modification impossible."); } finally { setWorking(false); }
  }

  async function approveDraft() {
    if (!selected || !draft) return;
    setWorking(true);
    try { const data = await apiFetch<{ draft: Draft }>(`/api/conversations/${selected.id}/drafts/${draft.id}/approve`, { method: "POST" }); setDraft(data.draft); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Validation impossible."); } finally { setWorking(false); }
  }

  async function sendDraft() {
    if (!selected || !draft) return;
    setWorking(true);
    try { await apiFetch(`/api/conversations/${selected.id}/drafts/${draft.id}/send`, { method: "POST" }); await openConversation(selected.id); await loadInbox(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Envoi impossible."); } finally { setWorking(false); }
  }

  async function escalate() {
    if (!selected) return;
    setWorking(true);
    try { await apiFetch(`/api/conversations/${selected.id}/escalate`, { method: "POST", body: JSON.stringify({ reason: "Confiance insuffisante ou intervention supervisor demandée." }) }); setSelected(null); setDraft(null); await loadInbox(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Escalade impossible."); } finally { setWorking(false); }
  }

  return <div className="view-content support-workspace">
    <div className="page-heading"><div><p className="eyebrow">{escalatedOnly ? "ESCALADES SENSIBLES" : "ESPACE OPERATIONNEL"}</p><h1>{escalatedOnly ? "File supervisor" : "Inbox"}</h1><p className="heading-sub">{escalatedOnly ? "Conversations à reprendre et décisions auditées." : supervisor ? "Toutes les conversations clients à superviser." : "L’IA prépare, l’agent décide."}</p></div></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="inbox-layout support-inbox-layout">
      <CustomerSheet selected={selected} />
      <section className="panel support-list"><div className="list-header"><strong>Conversations</strong><span className="muted-label">{conversations.length}</span></div>{loading && <p className="muted-label support-empty">Chargement…</p>}{!loading && conversations.length === 0 && <p className="muted-label support-empty">Aucune conversation.</p>}{conversations.map((conversation) => <button key={conversation.id} className={`conversation-item ${selected?.id === conversation.id ? "active" : ""}`} onClick={() => void openConversation(conversation.id)}><div className="conversation-top"><span className="conversation-name">{conversation.customer?.username ?? "Client"}</span><span className={`status-pill status-${conversation.priority}`}>{conversation.priority}</span></div><p>{conversation.messages.at(-1)?.text ?? "Nouveau message"}</p><div className="conversation-meta"><span>{conversation.status}</span><span>{conversation.order?.reference ?? "Sans commande"}</span></div></button>)}</section>
      <section className="panel support-detail">{!selected ? <div className="support-empty"><p className="eyebrow">SELECTION</p><h2>Choisissez une conversation</h2><p className="muted-label">La réponse IA et ses sources apparaîtront ici.</p></div> : <><div className="chat-header"><div><p className="eyebrow">CONVERSATION</p><h2>{selected.customer?.username ?? "Client"}</h2><p className="muted-label">{selected.order?.reference ?? "Aucune commande liée"} · sentiment {selected.sentiment ?? "à qualifier"}</p></div><span className={`status-pill status-${selected.status}`}>{selected.status}</span></div><div className="thread support-thread">{selected.messages.map((message) => <div className={`message ${message.authorRole === "client" ? "incoming" : "outgoing"}`} key={message.id}><span>{message.authorNom}</span><p>{message.text}</p></div>)}</div><div className="ai-suggestion support-ai"><div className="ai-title"><span className="spark">✦</span> Proposition IA <span className="ai-badge">{draft ? `${draft.confidence}%` : "Aucune"}</span></div>{draft ? <><textarea className="support-draft" value={editedText} onChange={(event) => setEditedText(event.target.value)} /><div className="source-list">{draft.sources?.map((source) => <span key={source.id} title={source.excerpt}>{source.title}</span>)}</div><div className="suggestion-actions"><button className="outline-button" onClick={() => void editDraft()} disabled={working}>Enregistrer correction</button><button className="outline-button" onClick={() => void approveDraft()} disabled={working || draft.status === "approuvee"}>Valider</button><button className="dark-button" onClick={() => void sendDraft()} disabled={working || draft.status !== "approuvee"}>Envoyer</button></div></> : <button className="dark-button" onClick={() => void generateDraft()} disabled={working}>Générer une réponse sourcée</button>}<button className="outline-button support-escalate" onClick={() => void escalate()} disabled={working}>Escalader au supervisor</button></div></>}</section>
    </div>
  </div>;
}

function CustomerSheet({ selected }: { selected: Conversation | null }) {
  if (!selected) {
    return <section className="panel customer-sheet"><div className="support-empty"><p className="eyebrow">FICHE CLIENT</p><h2>Aucune sélection</h2><p className="muted-label">Les informations client apparaîtront ici.</p></div></section>;
  }

  const order = selected.order;
  return <section className="panel customer-sheet">
    <div className="customer-sheet-header"><p className="eyebrow">FICHE CLIENT</p><h2>{selected.customer?.username ?? "Client"}</h2><p className="muted-label">{selected.customer?.email ?? "Email indisponible"}</p></div>
    <div className="customer-sheet-section"><span className="muted-label">Sentiment</span><strong className="customer-sentiment">{selected.sentiment ?? "À qualifier"}</strong></div>
    <div className="customer-sheet-section"><span className="muted-label">Intention</span><strong>{selected.intent ?? "Non précisée"}</strong></div>
    <div className="customer-sheet-section"><span className="muted-label">Urgence</span><strong>{selected.urgencyScore}/100</strong></div>
    <div className="customer-sheet-order"><p className="eyebrow">COMMANDE</p>{order ? <><div className="customer-order-line"><strong>{order.reference}</strong><span className={`status-pill status-${order.status}`}>{order.status}</span></div><div className="customer-order-items">{order.items.length > 0 ? order.items.map((item) => <div className="customer-order-item" key={`${item.nom}-${item.quantite}`}><span>{item.nom} × {item.quantite}</span><strong>{formatPrice(item.prix * item.quantite)}</strong></div>) : <p className="muted-label">Aucun article détaillé.</p>}</div><div className="customer-order-total"><span>Total</span><strong>{formatPrice(order.total)}</strong></div></> : <p className="muted-label">Aucune commande liée.</p>}</div>
  </section>;
}
