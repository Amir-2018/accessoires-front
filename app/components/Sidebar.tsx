"use client";
import { faBoxOpen, faTags, faUsers, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";

export type View = "articles" | "commandes" | "clients" | "categories";

const navItems: { id: View; label: string; icon: typeof faBoxOpen }[] = [
  { id: "commandes", label: "Commandes", icon: faBoxOpen },
  { id: "articles", label: "Articles", icon: faTags },
  { id: "clients", label: "Clients", icon: faUsers },
  { id: "categories", label: "Catégories", icon: faLayerGroup },
];

export function Sidebar({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  return <aside className="sidebar"><button className="brand-mark" aria-label="Accueil" onClick={() => onNavigate("commandes")}>O</button><div className="sidebar-nav">{navItems.map((item) => <button key={item.id} className={`side-nav-item ${view === item.id ? "active" : ""}`} onClick={() => onNavigate(item.id)} title={item.label} aria-label={item.label}><span className="side-icon"><Icon icon={item.icon} /></span><span className="side-label">{item.label}</span></button>)}</div></aside>;
}