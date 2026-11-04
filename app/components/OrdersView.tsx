"use client";

import { useMemo, useState } from "react";
import { useRequireRole } from "../lib/auth";
import { deleteOrder, formatPrice, getOrders, updateOrderStatus } from "../lib/store";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../interfaces/Order";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

const STATUSES: OrderStatus[] = ["en-attente", "validee", "expediee", "livree"];

/**
 * Vue commandes du supervisor.
 */
export function OrdersView() {
  const { user, ready } = useRequireRole(["supervisor"]);
  const [filter, setFilter] = useState<"Toutes" | OrderStatus>("Toutes");
  const [refresh, setRefresh] = useState(0);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [statusChange, setStatusChange] = useState<{ orderId: string; status: OrderStatus } | null>(null);

  const orders = useMemo(
    () => getOrders("supervisor").filter((o) => filter === "Toutes" || o.status === filter),
    [filter, refresh],
  );

  function setStatus(orderId: string, status: OrderStatus) {
    updateOrderStatus(orderId, status);
    setRefresh((n) => n + 1);
  }

  function removeOrder(orderId: string) {
    deleteOrder(orderId);
    setRefresh((n) => n + 1);
  }

  if (!ready || !user) return <p>Chargement…</p>;

  return (
    <div className="view-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ESPACE OPÉRATIONNEL</p>
          <h1>Commandes clients</h1>
          <p className="heading-sub">L&apos;ensemble des commandes passées par les clients.</p>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="filter-tabs">
          {(["Toutes", ...STATUSES] as const).map((s) => (
            <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
              {s === "Toutes" ? s : ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="panel order-table-panel">
        <table className="order-table">
          <thead><tr><th>N°</th><th>Client</th><th>Téléphone</th><th>Articles</th><th>Total</th><th>Statut</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            {orders.length === 0 && <tr><td colSpan={8} className="muted-label">Aucune commande.</td></tr>}
            {orders.map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.id}</strong></td>
                    <td>{o.clientNom}</td>
                    <td>{o.clientTelephone || "—"}</td>
                    <td>{o.items.map((i) => `${i.nom} ×${i.quantite}`).join(", ")}</td>
                    <td>{formatPrice(o.total)}</td>
                    <td><span className="status-pill status-in-progress">{ORDER_STATUS_LABELS[o.status]}</span></td>
                    <td>{new Date(o.createdAt).toLocaleString("fr-FR")}</td>
                    <td className="table-actions">
                      <select value={o.status} onChange={(e) => setStatusChange({ orderId: o.id, status: e.target.value as OrderStatus })} aria-label={`Statut de ${o.id}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                      </select>
                      <button className="icon-button danger-button" type="button" onClick={() => setOrderToDelete(o.id)} aria-label={`Supprimer la commande ${o.id}`} title="Supprimer la commande"><Icon icon={faTrash} /></button>
                    </td>
                  </tr>
            ))}
          </tbody>
        </table>
      </div>
      {statusChange && (
        <ConfirmDialog
          title="Confirmer le changement de statut ?"
          description={`La commande ${statusChange.orderId} passera au statut « ${ORDER_STATUS_LABELS[statusChange.status]} ».`}
          variant="primary"
          confirmLabel="Confirmer"
          onCancel={() => setStatusChange(null)}
          onConfirm={() => {
            const change = statusChange;
            setStatusChange(null);
            setStatus(change.orderId, change.status);
          }}
        />
      )}
      {orderToDelete && (
        <ConfirmDialog
          title="Supprimer cette commande ?"
          description={`La commande ${orderToDelete} sera supprimée définitivement.`}
          onCancel={() => setOrderToDelete(null)}
          onConfirm={() => { removeOrder(orderToDelete); setOrderToDelete(null); }}
        />
      )}
    </div>
  );
}
