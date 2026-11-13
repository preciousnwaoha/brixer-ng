"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem } from "@/lib/commerce";
const storageKey = "brixer-cart-v1";
interface CartState { items: CartItem[]; ready: boolean; quantity: (code: string) => number; change: (code: string, delta: number) => void; clear: () => void }
const CartContext = createContext<CartState | null>(null);
function parseCart(raw: string | null): CartItem[] {
  try { const data = JSON.parse(raw ?? "[]"); return Array.isArray(data) ? data.filter((i) => typeof i.serviceCode === "string" && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20).slice(0, 30) : []; } catch { return []; }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    try { setItems(parseCart(localStorage.getItem(storageKey))); } catch { /* In-memory cart remains usable. */ }
    setReady(true);
    const sync = (e: StorageEvent) => { if (e.key === storageKey) setItems(parseCart(e.newValue)); };
    window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch { /* In-memory cart remains usable. */ } } }, [items, ready]);
  function change(code: string, delta: number) {
    setItems((current) => { const quantity = Math.max(0, Math.min(20, (current.find((i) => i.serviceCode === code)?.quantity ?? 0) + delta)); const rest = current.filter((i) => i.serviceCode !== code); return quantity ? [...rest, { serviceCode: code, quantity }] : rest; });
  }
  const show = items.length > 0 && (pathname === "/" || pathname === "/services" || pathname.startsWith("/services/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/"));
  return <CartContext.Provider value={{ items, ready, quantity: (code) => items.find((i) => i.serviceCode === code)?.quantity ?? 0, change, clear: () => setItems([]) }}>{children}{show && <div className="fixed bottom-5 right-5 z-40"><Button href="/cart" className="shadow-xl"><ShoppingCart className="size-4" />Continue · {items.reduce((n, i) => n + i.quantity, 0)} items</Button></div>}</CartContext.Provider>;
}
export function useCart() { const cart = useContext(CartContext); if (!cart) throw new Error("Cart provider is missing"); return cart; }
