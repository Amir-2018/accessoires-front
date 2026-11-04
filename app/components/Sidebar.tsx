"use client";
import { faBoxOpen, faTags, faUsers, faLayerGroup, faTag, faChartPie } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";

export type View = "dashboard" | "articles" | "commandes" | "clients" | "categories" | "promotions";

const navItems: { id: View; label: string; icon: typeof faBoxOpen }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: faChartPie },
  { id: "commandes", label: "Commandes", icon: faBoxOpen },
  { id: "articles", label: "Articles", icon: faTags },
  { id: "clients", label: "Clients", icon: faUsers },
  { id: "categories", label: "Catégories", icon: faLayerGroup },
  { id: "promotions", label: "Promotions", icon: faTag },
];

export function Sidebar({ view, onNavigate, username, open }: { view: View; onNavigate: (view: View) => void; username: string; open: boolean }) {
  return (
    <aside id="supervisor-sidebar" className={`sidebar${open ? "" : " collapsed"}`} aria-label="Menu administrateur" aria-hidden={!open} inert={!open}>
      <div className="sidebar-account">
        <span className="sidebar-account-avatar" aria-hidden="true">{getUserInitials(username)}</span>
        <span className="sidebar-account-name">{username}</span>
      </div>
      <div className="sidebar-nav">{navItems.map((item) => <button key={item.id} className={`side-nav-item ${view === item.id ? "active" : ""}`} onClick={() => onNavigate(item.id)} title={item.label} aria-label={item.label}><span className="side-icon"><Icon icon={item.icon} /></span><span className="side-label">{item.label}</span></button>)}</div>
    </aside>
  );
}

function getUserInitials(username: string): string {
  const parts = username.trim().split(/[.\s_-]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "U"}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase();
}