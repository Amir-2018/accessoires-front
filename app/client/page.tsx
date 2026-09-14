"use client";

import { useState } from "react";
import { ShopHome } from "../components/ShopHome";
import type { ShopView } from "../components/shop-shell";

/** /client = meme page que l'accueil. */
export default function ClientPage() {
  const [initialView] = useState<ShopView>("catalogue");
  return <ShopHome initialView={initialView} />;
}
