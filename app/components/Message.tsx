"use client";

export type MessageVariant = "incoming" | "outgoing";

type MessageProps = {
  author: string;
  time: string;
  text: string;
  variant?: MessageVariant;
};

/**
 * Message — bulle de conversation réutilisable pour l'espace Inbox.
 *
 * Remplace les blocs `<div className="message ...">` inline par un vrai composant :
 * ```tsx
 * <Message author="Sarah Martin" time="10:38" text="Bonjour..." variant="incoming" />
 * <Message author="Vous" time="10:40" text="Bonjour Sarah..." variant="outgoing" />
 * ```
 */
export function Message({ author, time, text, variant = "incoming" }: MessageProps) {
  return (
    <div className={`message ${variant}`}>
      <span>
        {author} · {time}
      </span>
      <p>{text}</p>
    </div>
  );
}
