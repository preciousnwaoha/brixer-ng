"use client";

import { useMemo, useState } from "react";
import type { ServiceDefinition, ServiceCategory } from "@/types";
import { ServiceCard } from "./service-card";

const categories: { label: string; value: "all" | ServiceCategory }[] = [
  { label: "All services", value: "all" },
  { label: "CAC", value: "cac" },
  { label: "IP", value: "ip" },
  { label: "Tax & finance", value: "tax" },
  { label: "Trade", value: "trade" },
  { label: "Identity", value: "identity" },
  { label: "Banking", value: "banking" }
];

export function ServiceGrid({ services, limit }: { services: ServiceDefinition[]; limit?: number }) {
  const [category, setCategory] = useState<"all" | ServiceCategory>("all");
  const filtered = useMemo(() => {
    const items = category === "all" ? services : services.filter((service) => service.category === category);
    return typeof limit === "number" ? items.slice(0, limit) : items;
  }, [category, limit, services]);

  return (
    <div>
      {!limit && (
        <div className="mb-9 flex gap-2 overflow-x-auto pb-2 hide-scrollbar" aria-label="Filter services">
          {categories.map((item) => <button key={item.value} onClick={() => setCategory(item.value)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition ${category === item.value ? "border-primary bg-primary text-white" : "border-line bg-white text-muted hover:border-primary/40"}`}>{item.label}</button>)}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((service) => <ServiceCard key={service.code} service={service} />)}
      </div>
    </div>
  );
}
