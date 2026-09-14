"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Analytics = {
  volume: number;
  firstResponseMinutes: number | null;
  firstResponseCount: number;
  escalationRate: number;
  escalationCount: number;
  motifs: { label: string; count: number }[];
};

const emptyAnalytics: Analytics = { volume: 0, firstResponseMinutes: null, firstResponseCount: 0, escalationRate: 0, escalationCount: 0, motifs: [] };

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return "-";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;
}

export function Pilotage() {
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");
    try {
      setAnalytics(await apiFetch<Analytics>("/api/conversations/analytics/overview"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les indicateurs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAnalytics(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const maxMotifCount = Math.max(1, ...analytics.motifs.map((motif) => motif.count));

  return <div className="view-content pilotage-workspace">
    <div className="page-heading"><div><p className="eyebrow">PILOTAGE SUPPORT</p><h1>Pilotage</h1><p className="heading-sub">Mesurez la charge support et la qualité de prise en charge.</p></div><button className="outline-button" onClick={() => void loadAnalytics()} disabled={loading}>{loading ? "Actualisation..." : "Actualiser"}</button></div>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="kpi-grid">
      <div className="kpi-card"><span className="muted-label">Volume</span><strong>{analytics.volume}</strong><span className="kpi-change">Conversations reçues</span></div>
      <div className="kpi-card"><span className="muted-label">Première réponse</span><strong>{formatResponseTime(analytics.firstResponseMinutes)}</strong><span className="kpi-change">Moyenne - {analytics.firstResponseCount} répondue(s)</span></div>
      <div className="kpi-card"><span className="muted-label">Taux d&apos;escalade</span><strong>{analytics.escalationRate}%</strong><span className="kpi-change">{analytics.escalationCount} conversation(s) escaladée(s)</span></div>
      <div className="kpi-card"><span className="muted-label">Motif principal</span><strong>{analytics.motifs[0]?.label ?? "-"}</strong><span className="kpi-change">{analytics.motifs[0]?.count ?? 0} conversation(s)</span></div>
    </div>
    <div className="analytics-grid">
      <section className="chart-card"><div className="chart-title"><strong>Motifs les plus fréquents</strong><span>Top {analytics.motifs.length}</span></div><div className="pilotage-bars">{analytics.motifs.length === 0 ? <p className="muted-label pilotage-empty">Aucun motif disponible.</p> : analytics.motifs.map((motif) => <div className="pilotage-bar-row" key={motif.label}><span>{motif.label}</span><div className="pilotage-track"><i style={{ width: `${(motif.count / maxMotifCount) * 100}%` }} /></div><strong>{motif.count}</strong></div>)}</div></section>
      <section className="chart-card"><div className="chart-title"><strong>Lecture des indicateurs</strong><span>Support</span></div><div className="pilotage-summary"><div><strong>{formatResponseTime(analytics.firstResponseMinutes)}</strong><span>temps moyen avant réponse agent</span></div><div><strong>{analytics.escalationRate}%</strong><span>des conversations escaladées</span></div><div><strong>{analytics.volume}</strong><span>conversations analysées</span></div></div></section>
    </div>
  </div>;
}
