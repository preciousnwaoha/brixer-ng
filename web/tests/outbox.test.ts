// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/env", () => ({ env: { resendKey: "unit-test-resend", siteUrl: "https://brixer.example", whatsappEnabled: true } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { processOutbox } from "@/lib/outbox";

interface StoredDelivery {
  id: string;
  channel: string;
  notification_id?: string;
  destination: string;
  template_key: string;
  payload: Record<string, string>;
  attempt_count: number;
  next_attempt_at: string;
  created_at: string;
  status: string;
  provider_id?: string;
  last_error?: string | null;
}

function delivery(id: string, overrides: Partial<StoredDelivery> = {}): StoredDelivery {
  return { id, channel: "email", destination: `${id}@example.com`, template_key: "order_update", payload: { subject: "Order update", body: "Your order is processing." }, attempt_count: 0, next_attempt_at: "2026-10-30T00:00:00.000Z", created_at: "2026-10-30T00:00:00.000Z", status: "pending", ...overrides };
}

// Stateful database double: evaluate predicates and apply each update atomically.
// This lets competing workers receive stale snapshots while sharing live rows.
function database(rows: StoredDelivery[], fail?: "read" | "reserve" | "complete") {
  const snapshots: string[][] = [];
  return {
    snapshots,
    from: () => {
      const filters: ((row: StoredDelivery) => boolean)[] = [];
      let patch: Record<string, unknown> | undefined;
      let sortKey: keyof StoredDelivery | undefined;
      let rowLimit = Infinity;
      let single = false;
      const execute = () => {
        const operation = !patch ? "read" : "status" in patch ? "complete" : "reserve";
        if (fail === operation) return { data: null, error: new Error("Database unavailable") };
        let matched = rows.filter((row) => filters.every((filter) => filter(row)));
        if (sortKey) {
          const key = sortKey;
          matched = matched.slice().sort((a, b) => String(a[key]).localeCompare(String(b[key])));
        }
        matched = matched.slice(0, rowLimit);
        if (patch) matched.forEach((row) => Object.assign(row, patch));
        else snapshots.push(matched.map((row) => row.id));
        const data = matched.map((row) => ({ ...row }));
        return { data: single ? data[0] ?? null : data, error: null };
      };
      const query = {
        select: () => query,
        update: (values: Record<string, unknown>) => { patch = values; return query; },
        eq: (key: keyof StoredDelivery, value: unknown) => { filters.push((row) => row[key] === value); return query; },
        in: (key: keyof StoredDelivery, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return query; },
        lte: (key: keyof StoredDelivery, value: string) => { filters.push((row) => String(row[key]) <= value); return query; },
        order: (key: keyof StoredDelivery) => { sortKey = key; return query; },
        limit: (count: number) => { rowLimit = count; return query; },
        maybeSingle: () => { single = true; return query; },
        then: (resolve: (value: ReturnType<typeof execute>) => unknown, reject: (error: unknown) => unknown) => Promise.resolve().then(execute).then(resolve, reject)
      };
      return query;
    }
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T00:00:00.000Z"));
  mocks.send.mockResolvedValue({ data: { id: "provider-1" }, error: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("notification outbox", () => {
  it("dispatches only the triggering event instead of draining unrelated messages", async () => {
    const rows = [delivery("target", { notification_id: "event-1" }), delivery("unrelated", { notification_id: "event-2" })];
    mocks.createAdminClient.mockReturnValue(database(rows));
    expect(await processOutbox(["event-1"])).toEqual([{ id: "target", status: "sent" }]);
    expect(rows[1].status).toBe("pending");
  });

  it("handles an empty queue without contacting a delivery provider", async () => {
    mocks.createAdminClient.mockReturnValue(database([]));
    expect(await processOutbox()).toEqual([]);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("attempts the oldest 25 due messages, leaving the rest queued", async () => {
    const rows = Array.from({ length: 30 }, (_, index) => delivery(`delivery-${index}`, { created_at: new Date(Date.UTC(2026, 9, 30, 0, index)).toISOString() })).reverse();
    mocks.createAdminClient.mockReturnValue(database(rows));
    expect(await processOutbox()).toHaveLength(25);
    expect(mocks.send).toHaveBeenCalledTimes(25);
    expect(mocks.send.mock.calls[0][0].to).toBe("delivery-0@example.com");
    expect(mocks.send.mock.calls[24][0].to).toBe("delivery-24@example.com");
    expect(rows.filter((row) => row.status === "pending")).toHaveLength(5);
  });

  it("skips future retries and completed or permanently failed deliveries", async () => {
    const rows = [
      delivery("future", { status: "retrying", next_attempt_at: "2026-10-31T01:00:00.000Z" }),
      delivery("sent", { status: "sent" }), delivery("failed", { status: "failed" }),
      delivery("due-retry", { status: "retrying", attempt_count: 1 })
    ];
    mocks.createAdminClient.mockReturnValue(database(rows));
    expect(await processOutbox()).toEqual([{ id: "due-retry", status: "sent" }]);
    expect(rows[3]).toMatchObject({ attempt_count: 2, status: "sent", provider_id: "provider-1", last_error: null });
  });

  it.each([0, 4])("preserves retry backoff and the attempt limit after %i previous attempts", async (attempts) => {
    const row = delivery("retry", { attempt_count: attempts });
    mocks.createAdminClient.mockReturnValue(database([row]));
    mocks.send.mockResolvedValue({ data: null, error: { message: "Provider unavailable" } });
    expect(await processOutbox()).toEqual([{ id: "retry", status: "failed" }]);
    expect(row).toMatchObject({ attempt_count: attempts + 1, status: attempts === 4 ? "failed" : "retrying", last_error: "Provider unavailable", next_attempt_at: new Date(Date.now() + 2 ** (attempts + 1) * 60_000).toISOString() });
  });

  it("sends only once when overlapping workers select the same pending message", async () => {
    const row = delivery("shared");
    const db = database([row]);
    mocks.createAdminClient.mockReturnValue(db);
    const results = await Promise.all([processOutbox(), processOutbox()]);
    expect(db.snapshots).toEqual([["shared"], ["shared"]]);
    expect(results.flat()).toEqual([{ id: "shared", status: "sent" }]);
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(row.attempt_count).toBe(1);
  });

  it("recovers an interrupted reservation after five minutes", async () => {
    const row = delivery("interrupted", { next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString() });
    mocks.createAdminClient.mockReturnValue(database([row]));
    expect(await processOutbox()).toEqual([]);
    vi.setSystemTime(Date.now() + 5 * 60_000);
    expect(await processOutbox()).toEqual([{ id: "interrupted", status: "sent" }]);
  });

  it.each(["read", "reserve"] as const)("does not send when the database %s fails", async (operation) => {
    mocks.createAdminClient.mockReturnValue(database([delivery("blocked")], operation));
    await expect(processOutbox()).rejects.toThrow("Database unavailable");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("keeps a reservation if saving a successful send fails instead of marking it as a provider failure", async () => {
    const row = delivery("save-failed");
    mocks.createAdminClient.mockReturnValue(database([row], "complete"));
    await expect(processOutbox()).rejects.toThrow("Database unavailable");
    expect(row).toMatchObject({ status: "pending", attempt_count: 0, next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString() });
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("does not overwrite a reservation acquired by another worker", async () => {
    const row = delivery("lost-reservation");
    mocks.createAdminClient.mockReturnValue(database([row]));
    mocks.send.mockImplementation(async () => {
      row.next_attempt_at = new Date(Date.now() + 10 * 60_000).toISOString();
      return { data: { id: "provider-1" }, error: null };
    });
    await expect(processOutbox()).rejects.toThrow("Notification reservation is no longer held");
    expect(row.status).toBe("pending");
  });

  it("uses the same reservation and attempt handling for WhatsApp delivery", async () => {
    const row = delivery("whatsapp", { channel: "whatsapp", destination: "+234 801 234 5678" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "whatsapp-provider-1" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "unit-test-token");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "unit-test-number");
    mocks.createAdminClient.mockReturnValue(database([row]));
    expect(await processOutbox()).toEqual([{ id: "whatsapp", status: "sent" }]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ to: "2348012345678", type: "template" });
    expect(row).toMatchObject({ status: "sent", provider_id: "whatsapp-provider-1", attempt_count: 1 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
