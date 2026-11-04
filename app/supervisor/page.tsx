"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "../components/Sidebar";
import { OrdersView } from "../components/OrdersView";
import { useRequireRole } from "../lib/auth";
import { ArticlesAdmin } from "../components/ArticlesAdmin";
import { ClientsAdmin } from "../components/ClientsAdmin";
import { CategoriesAdmin } from "../components/CategoriesAdmin";
import { PromotionsAdmin } from "../components/PromotionsAdmin";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "../components/Icon";

type SupView = "commandes" | "articles" | "clients" | "categories" | "promotions";

/** Compte superviseur : sidebar de gestion + pilotage. */
export default function SupervisorSpace() {
  const { user, ready, signOut } = useRequireRole(["supervisor"]);
  const [view, setView] = useState<SupView>("commandes");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!ready || !user) return <main className="login-shell"><p>Chargement…</p></main>;

  return (
    <main className={`app-shell admin-shell${sidebarOpen ? "" : " admin-sidebar-collapsed"}`}>
      <header className="topbar">
        <Link href="/" className="topbar-brand topbar-brand-link" aria-label="Retour à l’accueil"><img className="brand-logo-nav" src="/logo.jpg" alt="" /> Ouou Accessoires</Link>
        <div className="topbar-user">
          <div className="user-menu">
            <button className="mini-avatar user-menu-trigger" onClick={() => setUserMenuOpen((open) => !open)} aria-label="Ouvrir le menu utilisateur" aria-expanded={userMenuOpen}>
              {getUserInitials(user.username)}
            </button>
            {userMenuOpen && <div className="user-menu-dropdown"><Link href="/login" onClick={signOut}>Déconnexion</Link></div>}
          </div>
        </div>
      </header>
      <button className={`menu-toggle admin-menu-toggle${sidebarOpen ? " is-open" : ""}`} onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? "Masquer le menu" : "Afficher le menu"} aria-expanded={sidebarOpen} aria-controls="supervisor-sidebar"><Icon icon={sidebarOpen ? faXmark : faBars} /></button>
      <Sidebar
        view={view}
        onNavigate={setView}
        username={user.username}
        open={sidebarOpen}
      />
      <div className="page-main">
        {view === "commandes" && <OrdersView />}
        {view === "articles" && <ArticlesAdmin />}
        {view === "clients" && <ClientsAdmin />}
        {view === "categories" && <CategoriesAdmin />}
        {view === "promotions" && <PromotionsAdmin />}
      </div>
    </main>
  );
}

function getUserInitials(username: string): string {
  const parts = username.split(/[.\s_-]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "U"}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase();
}
