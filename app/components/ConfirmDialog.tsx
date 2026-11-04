"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faCheck, faTrash, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "./Icon";

type ConfirmDialogProps = {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  variant?: "danger" | "primary";
  confirmLabel?: string;
  confirmIcon?: IconDefinition;
};

export function ConfirmDialog({
  title,
  description,
  onCancel,
  onConfirm,
  variant = "danger",
  confirmLabel,
  confirmIcon,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isDanger = variant === "danger";

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
      return;
    }

    if (event.key !== "Tab") return;
    const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    if (!buttons?.length) return;
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault();
      lastButton.focus();
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault();
      firstButton.focus();
    }
  }

  return (
    <div
      className="confirm-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onKeyDown={handleKeyDown}
      >
        <span className={`confirm-dialog-icon${isDanger ? "" : " confirm-dialog-icon-primary"}`}><Icon icon={faTriangleExclamation} /></span>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        <div className="confirm-dialog-actions">
          <button ref={cancelButtonRef} className="outline-button" onClick={onCancel}>Annuler</button>
          <button className={`dark-button ${isDanger ? "confirm-dialog-delete" : "confirm-dialog-confirm"}`} onClick={onConfirm}>
            <Icon icon={confirmIcon ?? (isDanger ? faTrash : faCheck)} /> {confirmLabel ?? (isDanger ? "Supprimer" : "Confirmer")}
          </button>
        </div>
      </section>
    </div>
  );
}