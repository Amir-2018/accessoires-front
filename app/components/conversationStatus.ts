"use client";

export type ConversationStatus = "pending" | "in-progress" | "resolved" | "validated";

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  pending: "En attente",
  "in-progress": "En cours",
  resolved: "Résolu",
  validated: "Validé",
};

export const CONVERSATION_STATUS_OPTIONS: ConversationStatus[] = [
  "pending",
  "in-progress",
  "resolved",
  "validated",
];

export const CONVERSATION_STATUS_FILTERS: ("Toutes" | ConversationStatus)[] = [
  "Toutes",
  ...CONVERSATION_STATUS_OPTIONS,
];

export function getStatusLabel(status: ConversationStatus): string {
  return CONVERSATION_STATUS_LABELS[status];
}
