"use client";

import { useEffect, useState } from "react";
import {
  faBox,
  faCartShopping,
  faChartLine,
  faTag,
  faTriangleExclamation,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../interfaces/Order";
import { apiFetch } from "../lib/api";
import { formatPrice } from "../lib/store";
import type { View } from "./Sidebar";

type Period = "7d" | "30d" | "90d";

type DashboardData = {
  period: { startDate: string; endDate: string };
  metrics: {
    orderCount: number;
    orderAmount: number;
    averageOrderAmount: number;
    clientCount: number;
    newClientCount: number;
    articleCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    activePromotionCount: number;
  };
  ordersByStatus: { status: OrderStatus; count: number }[];
  dailySales: { date: string; orderCount: number; amount: number }[];
  topArticles: { id: string; nom: string; quantity: number; amount: number }[];
  recentOrders: {
    id: string;
    clientNom: string;
    total: number;
    status: OrderStatus;
    createdAt: string;
  }[];
};

const periods: { value: Period; label: string }[] = [
  { value: "7d", label: "7 derniers jours" },
  { value: "30d", label: "30 derniers jours" },
  { value: "90d", label: "90 derniers jours" },
];

const orderStatuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function DashboardOverview({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [period, setPeriod] = useState<Period>("30d");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<DashboardData>(`/api/dashboard/overview?period=${period}`)
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setDashboard(null);
        setError(reason instanceof Error ? reason.message : "Impossible de charger le tableau de bord.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [period, refreshKey]);

  function changePeriod(value: Period) {
    setPeriod(value);
    setDashboard(null);
    setError("");
    setLoading(true);
  }

  function refresh() {
    setRefreshKey((key) => key + 1);
    setDashboard(null);
    setError("");
    setLoading(true);
  }

  const maxDailyAmount = Math.max(1, ...((dashboard?.dailySales ?? []).map((day) => day.amount)));
  const maxStatusCount = Math.max(1, ...((dashboard?.ordersByStatus ?? []).map((item) => item.count)));
  const maxTopArticleQuantity = Math.max(1, ...((dashboard?.topArticles ?? []).map((article) => article.quantity)));

  return (
    <div className="view-content dashboard-workspace">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">VUE D’ENSEMBLE</p>
          <h1>Tableau de bord</h1>
          <p className="heading-sub">Suivez l’activité de la boutique, les commandes et l’état du catalogue.</p>
        </div>
        <div className="dashboard-actions">
          <label className="dashboard-period">
            <span className="sr-only">Période des indicateurs</span>
            <select value={period} onChange={(event) => changePeriod(event.target.value as Period)}>
              {periods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="outline-button" type="button" onClick={refresh} disabled={loading}>
            {loading ? "Actualisation..." : "Actualiser"}
          </button>
        </div>
      </div>

      {error && <p className="login-error" role="alert">{error}</p>}
      {loading && !dashboard ? (
        <p className="dashboard-state" role="status">Chargement des indicateurs…</p>
      ) : dashboard ? (
        <>
          <p className="dashboard-period-caption">
            Données du {formatDate(dashboard.period.startDate)} au {formatDate(dashboard.period.endDate)}
          </p>

          <section className="dashboard-kpis" aria-label="Indicateurs clés">
            <MetricCard icon={faChartLine} label="Montant des commandes" value={formatPrice(dashboard.metrics.orderAmount)} detail={`${dashboard.metrics.orderCount} commande(s) sur la période`} />
            <MetricCard icon={faCartShopping} label="Commandes" value={String(dashboard.metrics.orderCount)} detail={`Panier moyen : ${formatPrice(dashboard.metrics.averageOrderAmount)}`} />
            <MetricCard icon={faUsers} label="Clients" value={String(dashboard.metrics.clientCount)} detail={`${dashboard.metrics.newClientCount} nouveau(x) sur la période`} />
            <MetricCard icon={faBox} label="Articles au catalogue" value={String(dashboard.metrics.articleCount)} detail={`${dashboard.metrics.outOfStockCount} en rupture de stock`} />
            <MetricCard icon={faTriangleExclamation} label="Stock faible" value={String(dashboard.metrics.lowStockCount)} detail="Articles avec 1 à 5 unités" />
            <MetricCard icon={faTag} label="Promotions actives" value={String(dashboard.metrics.activePromotionCount)} detail="Actives et valides aujourd’hui" />
          </section>

          <div className="dashboard-charts">
            <section className="chart-card dashboard-sales-card">
              <div className="dashboard-card-heading">
                <div><h2>Évolution des commandes</h2><p>Montant et nombre de commandes par jour</p></div>
                <span className="dashboard-card-total">{formatPrice(dashboard.metrics.orderAmount)}</span>
              </div>
              {dashboard.dailySales.length === 0 ? <p className="dashboard-empty">Aucune donnée sur cette période.</p> : (
                <div className="dashboard-sales-chart" role="img" aria-label={`Montants journaliers des commandes du ${formatDate(dashboard.period.startDate)} au ${formatDate(dashboard.period.endDate)}`}>
                  {dashboard.dailySales.map((day, index) => {
                    const height = day.amount > 0 ? Math.max(4, (day.amount / maxDailyAmount) * 100) : 0;
                    const labelInterval = dashboard.dailySales.length <= 7 ? 1 : dashboard.dailySales.length <= 30 ? 5 : 15;
                    const showLabel = index === 0 || index === dashboard.dailySales.length - 1 || index % labelInterval === 0;
                    return (
                      <div className="dashboard-sales-column" key={day.date} title={`${formatDate(day.date)} : ${formatPrice(day.amount)} · ${day.orderCount} commande(s)`}>
                        <span className="dashboard-sales-value">{day.orderCount > 0 ? day.orderCount : ""}</span>
                        <i style={{ height: `${height}%` }} />
                        <span className="dashboard-sales-date">{showLabel ? formatShortDate(day.date) : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="chart-card dashboard-status-card">
              <div className="dashboard-card-heading">
                <div><h2>Statut des commandes</h2><p>Répartition sur la période</p></div>
                <button className="dashboard-text-button" type="button" onClick={() => onNavigate("commandes")}>Voir les commandes</button>
              </div>
              <div className="dashboard-status-list">
                {orderStatuses.map((status) => {
                  const count = dashboard.ordersByStatus.find((item) => item.status === status)?.count ?? 0;
                  return (
                    <div className="dashboard-status-row" key={status}>
                      <span>{ORDER_STATUS_LABELS[status]}</span>
                      <div className="dashboard-track"><i style={{ width: `${(count / maxStatusCount) * 100}%` }} /></div>
                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="dashboard-lists">
            <section className="chart-card dashboard-top-card">
              <div className="dashboard-card-heading">
                <div><h2>Articles les plus vendus</h2><p>Quantités commandées sur la période</p></div>
                <button className="dashboard-text-button" type="button" onClick={() => onNavigate("articles")}>Voir le catalogue</button>
              </div>
              {dashboard.topArticles.length === 0 ? <p className="dashboard-empty">Aucun article vendu sur cette période.</p> : (
                <ol className="dashboard-top-list">
                  {dashboard.topArticles.map((article, index) => (
                    <li key={article.id}>
                      <span className="dashboard-rank">{index + 1}</span>
                      <div className="dashboard-top-details">
                        <div className="dashboard-top-label"><strong>{article.nom}</strong><span>{article.quantity} vendu(s)</span></div>
                        <div className="dashboard-track"><i style={{ width: `${(article.quantity / maxTopArticleQuantity) * 100}%` }} /></div>
                      </div>
                      <strong className="dashboard-top-amount">{formatPrice(article.amount)}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="chart-card dashboard-recent-card">
              <div className="dashboard-card-heading">
                <div><h2>Commandes récentes</h2><p>Dernières commandes enregistrées</p></div>
                <button className="dashboard-text-button" type="button" onClick={() => onNavigate("commandes")}>Tout voir</button>
              </div>
              {dashboard.recentOrders.length === 0 ? <p className="dashboard-empty">Aucune commande enregistrée.</p> : (
                <div className="dashboard-recent-list">
                  {dashboard.recentOrders.map((order) => (
                    <article className="dashboard-recent-order" key={order.id}>
                      <div className="dashboard-recent-main">
                        <strong>{order.clientNom || "Client"}</strong>
                        <span>#{order.id} · {formatDateTime(order.createdAt)}</span>
                      </div>
                      <div className="dashboard-recent-meta">
                        <strong>{formatPrice(order.total)}</strong>
                        <span className={`dashboard-status-pill dashboard-status-${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: typeof faBox; label: string; value: string; detail: string }) {
  return (
    <article className="kpi-card dashboard-metric-card">
      <span className="dashboard-metric-icon" aria-hidden="true"><Icon icon={icon} /></span>
      <span className="muted-label">{label}</span>
      <strong className="dashboard-metric-value">{value}</strong>
      <span className="dashboard-metric-detail">{detail}</span>
    </article>
  );
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");
}

function formatShortDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
