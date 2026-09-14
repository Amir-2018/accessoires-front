"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSessionUser } from "../lib/store";
import { apiFetch } from "../lib/api";
import { useRouter } from "next/navigation";

type ChatMsg = { from: "bot" | "user"; text: string };

/** Icône chatbot en bas à droite : questions sur les commandes. */
export function ChatbotButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    { from: "bot", text: "Bonjour ! Posez-moi une question sur vos commandes (ex : ou est ma commande CMD-123456 ?)." },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<ReturnType<typeof getSessionUser>>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setUser(getSessionUser()), 0);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    return () => window.clearTimeout(timer);
  }, [messages, open]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    if (user?.role === "client") {
      try {
        await apiFetch<{ conversation: { id: string } }>("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        setMessages((prev) => [...prev, { from: "bot", text: "Votre question a été transmise au service client. Un agent va vérifier votre commande et vous répondra dans Messages." }]);
      } catch (reason) {
        const message = reason instanceof Error && reason.message.includes("401")
          ? "Votre session a expiré. Déconnectez-vous puis reconnectez-vous pour transmettre votre question à un agent."
          : "Votre demande n'a pas pu être transmise au support. Réessayez dans un instant.";
        setMessages((prev) => [...prev, { from: "bot", text: message }]);
      }
      return;
    }
    setMessages((prev) => [...prev, { from: "bot", text: "Le chatbot est disponible uniquement pour les comptes clients connectés." }]);
  }

  return (
    <>
      <button
        className="chatbot-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant commandes"}
      >
        {open ? "X" : "?"}
      </button>
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="Assistant commandes">
          <div className="chatbot-header"><strong>Assistant commandes</strong></div>
          {!user ? <div className="chatbot-login-required"><p>Connectez-vous pour poser une question sur vos commandes et recevoir une réponse du support.</p><button className="dark-button" onClick={() => router.push("/login")}>Se connecter</button></div> : <><div className="chatbot-messages">{messages.map((m, i) => <p key={i} className={`chatbot-msg ${m.from}`}>{m.text}</p>)}<div ref={bottomRef} /></div><form className="chatbot-form" onSubmit={send}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Votre question..." aria-label="Votre question sur les commandes" /><button type="submit" className="dark-button">OK</button></form></>}
        </div>
      )}
    </>
  );
}
