"use client";
import { useCart } from "@/components/cart/cart-provider";
import { Minus, Plus, Clock3 } from "lucide-react";
import type { ServiceDefinition } from "@/types";
import { formatNaira } from "@/lib/utils";
import { ServiceIcon } from "@/components/ui/service-icon";

export function ServiceCard({ service }: { service: ServiceDefinition }) {
  const cart = useCart();
  const quantity = cart.quantity(service.code);
  return (
    <article className="group flex flex-col rounded-[1.6rem] border border-line bg-white p-6 shadow-[0_12px_35px_rgba(27,67,50,.045)] transition duration-300 hover:-translate-y-1 hover:border-alt-sage hover:shadow-[0_22px_60px_rgba(27,67,50,.13)]">
      <div className="inline-flex items-start justify-between ">
        <div className="flex items-center gap-3">
          <ServiceIcon name={service.icon} />
          <div className="flex flex-col items-start lg:hidden">
            <p className=" text-[10px] font-extrabold uppercase tracking-[.17em] text-secondary">
              {service.categoryLabel}
            </p>
            <h3 className=" text-xl font-extrabold tracking-tight text-primary">
              {service.shortName}
            </h3>
          </div>
        </div>

        {quantity > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-alt-mint p-1">
            <button
              className="grid size-9 place-items-center"
              aria-label={`Remove one ${service.shortName}`}
              onClick={() => cart.change(service.code, -1)}
            >
              <Minus className="size-4" />
            </button>
            <span aria-live="polite" className="font-bold">
              {quantity}
            </span>
            <button
              className="grid size-9 place-items-center disabled:opacity-40"
              disabled={quantity >= 20}
              aria-label={`Add one ${service.shortName}`}
              onClick={() => cart.change(service.code, 1)}
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
        {!service.available && (
          <span className="rounded-full bg-alt-cream px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-secondary">
            Coming soon
          </span>
        )}
      </div>
      <div className="hidden flex-col items-start lg:flex">
        <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[.17em] text-secondary">
          {service.categoryLabel}
        </p>
        <h3 className="mt-2 text-xl font-extrabold tracking-tight text-primary">
          {service.shortName}
        </h3>
      </div>

      <p className="mt-3 flex-1 text-sm leading-6 text-muted">
        {service.description}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-lg font-black text-primary">
          {formatNaira(service.priceKobo)}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f8f7] px-3 py-1.5 text-[10px] font-bold text-muted">
          <Clock3 className="size-3" />
          {service.timeline}
        </span>
      </div>
      <button
        disabled={!service.available || quantity >= 20}
        onClick={() => cart.change(service.code, 1)}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-alt-mint px-3 text-sm font-extrabold text-primary disabled:opacity-50"
      >
        {service.available
          ? quantity
            ? "Add another"
            : "Select service"
          : "Coming soon"}
        <Plus className="size-4" />
      </button>
    </article>
  );
}
