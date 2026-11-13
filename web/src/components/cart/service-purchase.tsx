"use client";
import { useCart } from "./cart-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ServiceDefinition } from "@/types";
export function ServicePurchase({ service }: { service: ServiceDefinition }) {
  const cart = useCart(); const router = useRouter();
  return <Button disabled={!service.available} onClick={() => { cart.change(service.code, 1); router.push("/cart"); }} className="mt-6 w-full">{service.available ? "Add service and review" : "Coming soon"}</Button>;
}
