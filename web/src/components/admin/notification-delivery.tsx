"use client";

import { useMutation } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliverySummary {
  processed: number;
  sent: number;
  unsuccessful: number;
  demo?: boolean;
}

export function NotificationDelivery() {
  const delivery = useMutation({
    retry: false,
    mutationFn: async (): Promise<DeliverySummary> => {
      const response = await fetch("/api/admin/notifications/process", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to send queued notifications.");
      return result;
    }
  });

  let feedback = "";
  if (delivery.data?.demo) feedback = "Demo preview: no notifications were sent.";
  else if (delivery.data?.processed === 0) feedback = "No queued notifications are ready to send.";
  else if (delivery.data) feedback = `Attempted ${delivery.data.processed} notifications: ${delivery.data.sent} delivered, ${delivery.data.unsuccessful} unsuccessful.`;

  return (
    <section id="notifications" aria-labelledby="notifications-title" className="mt-6 scroll-mt-24 rounded-2xl border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="notifications-title" className="flex items-center gap-2 font-extrabold text-primary"><BellRing className="size-5 text-secondary" aria-hidden="true" />Notifications</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Updates are sent when payments are confirmed or the team changes a service item. Retry up to 25 ready messages here; delivery history shows messages that need attention.</p>
        </div>
        <Button onClick={() => delivery.mutate()} disabled={delivery.isPending} aria-busy={delivery.isPending}>
          {delivery.isPending ? "Sending…" : "Send queued notifications"}
        </Button>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {delivery.isPending && <p className="mt-4 text-sm font-bold text-primary">Sending queued notifications…</p>}
        {!delivery.isPending && delivery.isSuccess && <p className="mt-4 text-sm font-bold text-primary">{feedback}</p>}
      </div>
      {delivery.isError && <p role="alert" className="mt-4 text-sm font-bold text-red-700">{delivery.error.message}</p>}
    </section>
  );
}
