"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "../interfaces/User";
import { apiFetch } from "../lib/api";
import { defaultRoute, getSessionUser } from "../lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getSessionUser();
    if (session) router.replace(defaultRoute(session.role));
  }, [router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const id = identifier.trim();
    if (!id || !password || (mode === "register" && !email.trim())) {
      setError(mode === "register" ? "Veuillez renseigner tous les champs." : "Veuillez saisir votre identifiant et votre mot de passe.");
      return;
    }
    if (mode === "register" && password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const request = mode === "register"
      ? apiFetch<{ user: Omit<User, "password"> }>("/api/auth/register", { method: "POST", body: JSON.stringify({ username: id, email: email.trim(), identifier: id, password }) })
      : apiFetch<{ user: Omit<User, "password"> }>("/api/auth/login", { method: "POST", body: JSON.stringify({ identifier: id, password }) });
    request
      .then(({ user }) => {
        console.log("User logged in:", user);
        localStorage.setItem("zen:user", JSON.stringify(user));
        router.push(defaultRoute(user.role));
      })
      .catch((reason) => {
        const message = reason instanceof Error ? reason.message : "";
        setError(message.startsWith("401:")
          ? "Identifiants incorrects. Vérifiez votre email et votre mot de passe."
          : message.startsWith("409:")
            ? "Cet email ou ce nom d’utilisateur est déjà utilisé."
          : message || "Service de connexion indisponible. Vérifiez la configuration de l’API.");
      })
      .finally(() => setLoading(false));
  }

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError(null);
    setIdentifier("");
    setEmail("");
    setPassword("");
    setPasswordConfirmation("");
  }

  return (
    <main className="login-shell">
      <header className="login-navbar"><Link href="/" className="login-navbar-brand"><img className="login-logo" src="/logo.jpg" alt="" /><span>Ouou Accessoires</span></Link><Link href="/" className="login-home-link">Retour à l’accueil</Link></header>
      <div className="login-card">
        <div className="login-brand"><img className="login-logo" src="/logo.jpg" alt="" /><div><p className="eyebrow">OUOU ACCESSOIRES</p><h1>{mode === "login" ? "Connexion" : "Créer un compte"}</h1><p className="heading-sub">{mode === "login" ? "Accédez à votre espace client ou superviseur." : "Créez votre compte client pour commander en ligne."}</p></div></div>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-field"><span>{mode === "register" ? "Nom d’utilisateur" : "Nom d’utilisateur ou email"}</span><input type="text" autoComplete="username" placeholder={mode === "register" ? "ex. mon.compte" : "ex. client.demo ou client@zen.local"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></label>
          {mode === "register" && <label className="login-field"><span>Email</span><input type="email" autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
          <label className="login-field"><span>Mot de passe</span><div className="login-password"><input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="login-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? "◠" : "◡"}</button></div></label>
          {mode === "register" && <label className="login-field"><span>Confirmer le mot de passe</span><input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} /></label>}
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="dark-button login-submit" disabled={loading}>{loading ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
        </form>
        <div className="login-switch">{mode === "login" ? <><span>Pas encore de compte client ?</span><button type="button" onClick={() => switchMode("register")}>S’inscrire</button></> : <><span>Vous avez déjà un compte ?</span><button type="button" onClick={() => switchMode("login")}>Se connecter</button></>}</div>
      </div>
    </main>
  );
}
