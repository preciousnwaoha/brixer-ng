import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/dashboard/admin", (route) => route.fulfill({ json: { orders: [] } }));
});

test("admin can send a batch with pending and delivery summary feedback", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/admin/notifications/process", async (route) => {
    expect(route.request().method()).toBe("POST");
    await pending;
    await route.fulfill({ json: { processed: 3, sent: 2, unsuccessful: 1 } });
  });
  await page.goto("/admin#notifications");
  const panel = page.getByRole("region", { name: "Notifications", exact: true });
  await panel.getByRole("button", { name: "Send queued notifications" }).click();
  await expect(panel.getByRole("button", { name: "Sending…", exact: true })).toBeDisabled();
  await expect(panel.getByRole("status")).toContainText("Sending queued notifications");
  release();
  await expect(panel.getByRole("status")).toHaveText("Attempted 3 notifications: 2 delivered, 1 unsuccessful.");
  await expect(panel.getByRole("button", { name: "Send queued notifications" })).toBeEnabled();
});

for (const scenario of [
  { name: "empty queue", response: { processed: 0, sent: 0, unsuccessful: 0 }, message: "No queued notifications are ready to send." },
  { name: "demo preview", response: { processed: 0, sent: 0, unsuccessful: 0, demo: true }, message: "Demo preview: no notifications were sent." }
]) {
  test(`admin sees clear feedback for an ${scenario.name}`, async ({ page }) => {
    await page.route("**/api/admin/notifications/process", (route) => route.fulfill({ json: scenario.response }));
    await page.goto("/admin#notifications");
    const panel = page.getByRole("region", { name: "Notifications", exact: true });
    await panel.getByRole("button", { name: "Send queued notifications" }).click();
    await expect(panel.getByRole("status")).toHaveText(scenario.message);
  });
}

test("admin sees errors without automatic retries and can retry explicitly", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/admin/notifications/process", (route) => {
    requests++;
    return requests === 1
      ? route.fulfill({ status: 503, json: { error: "Notification delivery is not configured." } })
      : route.fulfill({ json: { processed: 0, sent: 0, unsuccessful: 0 } });
  });
  await page.goto("/admin#notifications");
  const panel = page.getByRole("region", { name: "Notifications", exact: true });
  await panel.getByRole("button", { name: "Send queued notifications" }).click();
  await expect(panel.getByRole("alert")).toHaveText("Notification delivery is not configured.");
  expect(requests).toBe(1);
  await panel.getByRole("button", { name: "Send queued notifications" }).click();
  await expect(panel.getByRole("status")).toHaveText("No queued notifications are ready to send.");
  await expect(panel.getByRole("alert")).toHaveCount(0);
  expect(requests).toBe(2);
});

test("staff dashboard has no manual notification delivery control", async ({ page }) => {
  await page.route("**/api/dashboard/staff", (route) => route.fulfill({ json: { jobs: [] } }));
  await page.goto("/staff");
  await expect(page.getByRole("heading", { name: "Staff dashboard — Tolu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send queued notifications" })).toHaveCount(0);
});
