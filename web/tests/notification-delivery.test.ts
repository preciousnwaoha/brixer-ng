import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationDelivery } from "@/components/admin/notification-delivery";
let client: QueryClient;
const fetchMock = vi.fn();
function showPanel() { client = new QueryClient({ defaultOptions: { mutations: { retry: false } } }); return render(createElement(QueryClientProvider, { client }, createElement(NotificationDelivery))); }
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => { cleanup(); client?.clear(); vi.unstubAllGlobals(); });
describe("admin notification delivery feedback", () => {
  it("shows the pending state and final summary without automatic retries", async () => {
    let release!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { release = resolve; }));
    showPanel(); fireEvent.click(screen.getByRole("button", { name: "Send queued notifications" }));
    expect((await screen.findByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(true);
    release(Response.json({ processed: 3, sent: 2, unsuccessful: 1 }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Attempted 3 notifications: 2 delivered, 1 unsuccessful."));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([{ response: { processed: 0, sent: 0, unsuccessful: 0 }, message: "No queued notifications are ready to send." }, { response: { processed: 0, sent: 0, unsuccessful: 0, demo: true }, message: "Demo preview: no notifications were sent." }])("reports $message", async ({ response, message }) => {
    fetchMock.mockResolvedValue(Response.json(response)); showPanel(); fireEvent.click(screen.getByRole("button", { name: "Send queued notifications" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(message));
  });
  it("allows an explicit retry after a provider error", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Notification delivery is not configured." }, { status: 503 })).mockResolvedValueOnce(Response.json({ processed: 0, sent: 0, unsuccessful: 0 }));
    showPanel(); fireEvent.click(screen.getByRole("button", { name: "Send queued notifications" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Notification delivery is not configured."); expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Send queued notifications" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("No queued notifications are ready to send."));
    expect(screen.queryByRole("alert")).toBeNull(); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
