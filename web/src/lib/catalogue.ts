import { services } from "@/config/services";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceDefinition } from "@/types";

export async function getCatalogue(): Promise<ServiceDefinition[]> {
  if (env.demoMode) return services;
  const { data, error } = await createAdminClient().from("services").select("definition").order("sort_order");
  if (error) throw new Error("The service catalogue is temporarily unavailable.");
  return (data ?? []).map((row) => row.definition as ServiceDefinition);
}

export async function findService(slug: string) { return (await getCatalogue()).find((service) => service.slug === slug); }
