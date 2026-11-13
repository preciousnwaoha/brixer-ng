"use client";
import { useEffect } from "react";
import { useCart } from "./cart-provider";
export function ClearPaidCart({ reference }: { reference: string }) {
  const cart = useCart();
  useEffect(() => {
    if (!cart.ready) return;
    try { const previous = JSON.parse(sessionStorage.getItem("brixer-checkout") ?? "null");
      if (previous?.reference === reference) { if (JSON.stringify(previous.items) === JSON.stringify(cart.items)) cart.clear(); sessionStorage.removeItem("brixer-checkout"); sessionStorage.removeItem("brixer-payment-intent"); }
    } catch { /* Leave the cart intact when receipt context is unavailable. */ }
  }, [reference, cart]);
  return null;
}
