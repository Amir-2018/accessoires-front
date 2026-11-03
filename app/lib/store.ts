import type { Article } from "../interfaces/Article";
import type { Order, OrderStatus } from "../interfaces/Order";
import type { MessageAuthorRole, OrderMessage } from "../interfaces/OrderMessage";
import type { User, UserRole } from "../interfaces/User";
import { isPromotionInDateRange } from "./promotions";

const USER_KEY = "zen:user";
const ORDERS_KEY = "zen:orders";
const MESSAGES_KEY = "zen:order-messages";
const GUEST_ORDER_KEY = "zen:guest-order-id";
const PENDING_GUEST_ORDER_KEY = "zen:pending-guest-order-id";

export type SessionUser = Omit<User, "password">;

export type GuestCustomer = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
};

const ARTICLES: Article[] = [
  { id: "a-robe", nom: "Robe fluide", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=85", description: "Robe légère à la coupe élégante, parfaite au quotidien.", prix: 499, stock: 16, categorie: "Robes" },
  { id: "a-veste", nom: "Veste en denim", image: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&w=900&q=85", description: "Veste en denim intemporelle, facile à porter en toute saison.", prix: 699, stock: 11, categorie: "Vestes" },
  { id: "a-chemise", nom: "Chemise en lin", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85", description: "Chemise en lin respirante avec une coupe décontractée.", prix: 349, stock: 24, categorie: "Chemises" },
  { id: "a-pantalon", nom: "Pantalon droit", image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85", description: "Pantalon droit confortable, conçu pour accompagner toutes vos tenues.", prix: 449, stock: 19, categorie: "Pantalons" },
  { id: "a-pull", nom: "Pull en maille", image: "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=900&q=85", description: "Pull doux en maille avec une silhouette chaleureuse et moderne.", prix: 399, stock: 14, categorie: "Pulls" },
  { id: "a-sneakers", nom: "Sneakers en toile", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85", description: "Sneakers en toile souples et légères pour tous les jours.", prix: 549, stock: 21, categorie: "Chaussures" },
];

export function getArticles(): Article[] {
  return ARTICLES;
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function getGuestOrderId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(GUEST_ORDER_KEY);
}

export function saveGuestOrderId(orderId: string): void {
  localStorage.setItem(GUEST_ORDER_KEY, orderId);
  localStorage.setItem(PENDING_GUEST_ORDER_KEY, orderId);
}

export function takePendingGuestOrderId(): string | null {
  if (typeof window === "undefined") return null;
  const orderId = localStorage.getItem(PENDING_GUEST_ORDER_KEY);
  localStorage.removeItem(PENDING_GUEST_ORDER_KEY);
  return orderId;
}

export function logout(): void {
  localStorage.removeItem(USER_KEY);
}

function readOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: Order[]): void {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

/** Toutes les commandes (agent + supervisor), ou celles du client donné. */
export function getOrders(role: UserRole, clientId?: string): Order[] {
  const all = readOrders();
  if (role === "client") return all.filter((o) => o.clientId === clientId);
  return all;
}

export function createOrder(
  user: SessionUser | GuestCustomer,
  items: { article: Article; quantite: number }[],
  options: { reference?: string; promotionSlug?: string | null; subtotal?: number; discountTotal?: number; total?: number } = {},
): Order {
  const isGuest = "telephone" in user;
  const orderItems = items.map((i) => {
    const promotion = i.article.promotion && isPromotionInDateRange(i.article.promotion) ? i.article.promotion : null;
    const discountPercent = promotion && promotion.discountPercent > 0 ? Math.max(0, Math.min(100, promotion.discountPercent)) : 0;
    return {
      articleId: i.article.id,
      nom: i.article.nom,
      prixOriginal: i.article.prix,
      discountPercent,
      prix: Math.round(i.article.prix * (1 - discountPercent / 100) * 1000) / 1000,
      quantite: i.quantite,
    };
  });
  const subtotal = options.subtotal ?? items.reduce((sum, item) => sum + item.article.prix * item.quantite, 0);
  const calculatedTotal = orderItems.reduce((sum, item) => sum + item.prix * item.quantite, 0);
  const total = options.total ?? calculatedTotal;
  const discountTotal = options.discountTotal ?? subtotal - total;
  const order: Order = {
    id: options.reference ?? `CMD-${Date.now().toString().slice(-6)}`,
    clientId: isGuest ? `guest-${Date.now()}` : user.id,
    clientNom: isGuest ? `${user.prenom} ${user.nom}` : user.username,
    ...(isGuest
      ? {
          clientPrenom: user.prenom,
          clientEmail: user.email,
          clientTelephone: user.telephone,
          clientAdresse: user.adresse,
        }
      : { clientEmail: user.email }),
    items: orderItems,
    subtotal,
    discountTotal,
    ...(options.promotionSlug ? { promotionSlug: options.promotionSlug } : {}),
    total,
    status: "en-attente",
    createdAt: new Date().toISOString(),
  };
  writeOrders([order, ...readOrders()]);
  seedOrderMessage(order);
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus): Order[] {
  const updated = readOrders().map((o) => (o.id === orderId ? { ...o, status } : o));
  writeOrders(updated);
  return updated;
}

export function deleteOrder(orderId: string): Order[] {
  const remaining = readOrders().filter((order) => order.id !== orderId);
  writeOrders(remaining);
  writeMessages(readMessages().filter((message) => message.orderId !== orderId));
  return remaining;
}

export function formatPrice(value: number): string {
  return `${value.toLocaleString("fr-TN")} DT`;
}

/** --- Messages liés aux commandes (fil de discussion par commande) --- */

function readMessages(): OrderMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as OrderMessage[]) : [];
  } catch {
    return [];
  }
}

function writeMessages(messages: OrderMessage[]): void {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

/** Messages d'une commande, ordre chronologique. */
export function getOrderMessages(orderId: string): OrderMessage[] {
  return readMessages()
    .filter((m) => m.orderId === orderId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Nombre de messages par commande (pour les badges). */
export function countOrderMessages(orderId: string): number {
  return readMessages().filter((m) => m.orderId === orderId).length;
}

export function addOrderMessage(
  orderId: string,
  author: { role: MessageAuthorRole; nom: string },
  text: string,
): OrderMessage {
  const message: OrderMessage = {
    id: `MSG-${Date.now().toString().slice(-6)}`,
    orderId,
    authorRole: author.role,
    authorNom: author.nom,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  writeMessages([...readMessages(), message]);
  return message;
}

/** Message système automatique à la création d'une commande. */
function seedOrderMessage(order: Order): void {
  writeMessages([
    ...readMessages(),
    {
      id: `MSG-${order.id}-created`,
      orderId: order.id,
      authorRole: "system",
      authorNom: "ZEN",
      text: `Commande ${order.id} créée par ${order.clientNom} — total ${formatPrice(order.total)}. Un agent va la traiter.`,
      createdAt: order.createdAt,
    },
  ]);
}

/** Espace par défaut après connexion selon le rôle. */
export function defaultRoute(role: UserRole): string {
  if (role === "client") return "/";
  if (role === "supervisor") return "/supervisor";
  return "/login";
}
