import { expect, test, type Page } from "@playwright/test";
import { demoDashboard } from "../../src/lib/dashboard-data";
import type { InformationRequest } from "../../src/types/operations";

function fixture() {
  const data = demoDashboard();
  data.profile.full_name = "Amina";
  const issue = { id: "11111111-1111-4111-8111-111111111111", order_id: "2", stage: "processing" as const, message: "Please confirm the corrected business details.", status: "open" as const, created_at: "2026-11-12T10:00:00Z", submitted_at: null, cleared_at: null, history: [] };
  data.orders[1].order_issues = [issue];
  const definitions: [InformationRequest["input_type"], string][] = [["text", "Corrected business name"], ["tel", "Contact phone"], ["email", "Contact email"], ["date", "Registration date"], ["select", "Office"], ["file", "Certificate"]];
  data.orders[1].information_requests = definitions.map(([input_type, label], index) => ({ id: `22222222-2222-4222-8222-22222222222${index}`, order_id: "2", issue_id: issue.id, input_type, label, description: "", required: true, options: input_type === "select" ? ["Lagos", "Abuja"] : [], allowed_mime_types: ["application/pdf"], status: "pending", response: null }));
  data.orders[2].documents = [{ id: "33333333-3333-4333-8333-333333333333", file_name: "Completed certificate.pdf", kind: "completed", released_at: "2026-11-12T10:00:00Z", field_id: null, information_request_id: null }];
  return data;
}
async function openNav(page: Page, label: string) {
  const menu = page.getByRole("button", { name: "Open dashboard menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name: label, exact: true }).click();
}
test("dashboard statistics and order cards respond at the sm breakpoint", async ({ page }, testInfo) => {
  const data = fixture(); await page.route("**/api/dashboard/client", (route) => route.fulfill({ json: data }));
  await page.goto("/dashboard");
  const stats = page.getByRole("region", { name: "Order statistics" });
  for (const label of ["Active orders", "Pending Info", "Completed documents", "Pending balance"]) await expect(stats.getByText(label, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View pending info", exact: true })).toHaveAttribute("href", "/dashboard/orders?filter=attention");
  for (const width of [375, 639, 640, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await stats.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(width < 640 ? 2 : 4);
    expect(await page.getByTestId("order-grid").evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(width < 640 ? 1 : 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if ([375, 640, 1280].includes(width)) await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
  }
  await expect(page.getByText("Pending details", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter Needed Details", exact: true })).toHaveAttribute("href", "/dashboard/orders/1/application");
  await expect(page.getByRole("link", { name: "Resolve issue", exact: true })).toBeVisible();
  await openNav(page, "Your Documents"); await expect(page).toHaveURL(/\/dashboard\/documents$/);
  await expect(page.getByText("Completed certificate.pdf", { exact: true })).toBeVisible();
  await openNav(page, "Referral"); await expect(page).toHaveURL(/\/dashboard\/referral$/);
  await expect(page.getByText("Available referral balance", { exact: true })).toBeVisible();
  await expect(page.getByText(/connect (whatsapp|phone)/i)).toHaveCount(0);
});

test("dashboard service selection shares the cart across dashboard pages", async ({ page }) => {
  await page.goto("/dashboard"); await openNav(page, "New order"); await expect(page).toHaveURL(/\/dashboard\/new-order$/);
  await expect(page.getByRole("heading", { name: "Choose your services", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Register. Protect. Grow.", exact: true })).toHaveCount(0);
  const service = page.locator("article").filter({ has: page.getByRole("heading", { name: "Business Name (BN)", exact: true }) });
  await service.getByRole("button", { name: "Select service", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/new-order$/);
  await expect(page.getByRole("link", { name: "Cart, 1 items", exact: true })).toBeVisible();
  await openNav(page, "Your Documents");
  await expect(page.getByRole("link", { name: "Continue · 1 items", exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole("link", { name: "Cart, 1 items", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Continue · 1 items", exact: true }).click(); await expect(page).toHaveURL(/\/cart$/);
});

test("an issue form submits typed details and changes its card to Settling issue", async ({ page }) => {
  const data = fixture(); const order = data.orders[1]; const issue = order.order_issues![0];
  await page.route("**/api/dashboard/client", (route) => route.fulfill({ json: data }));
  await page.route("**/api/orders/2", (route) => route.fulfill({ json: { order, options: [], payments: [], operator: false } }));
  await page.route("**/api/storage/sign", (route) => route.fulfill({ json: { uploadUrl: "https://uploads.example.test/certificate", uploadId: "upload" } }));
  await page.route("https://uploads.example.test/certificate", (route) => route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "PUT, OPTIONS", "Access-Control-Allow-Headers": "content-type, if-none-match" } }));
  const documentId = "44444444-4444-4444-8444-444444444444";
  await page.route("**/api/storage/finalize", (route) => route.fulfill({ json: { stored: true, documentId } }));
  await page.route(`**/api/orders/2/issues/${issue.id}`, async (route) => {
    const body = route.request().postDataJSON(); expect(body.action).toBe("submit");
    expect(Object.values(body.answers)).toEqual(expect.arrayContaining(["Amina Limited", "+2348012345678", "amina@example.com", "2026-11-12", "Lagos", documentId]));
    order.order_issues![0] = { ...issue, status: "submitted", submitted_at: "2026-11-12T11:00:00Z" };
    order.information_requests.forEach((field) => { field.status = "submitted"; field.response = body.answers[field.id]; });
    await route.fulfill({ json: { saved: true } });
  });
  await page.goto("/dashboard/orders");
  await page.getByRole("link", { name: "Resolve issue", exact: true }).click();
  await page.getByLabel("Corrected business name *", { exact: true }).fill("Amina Limited");
  await page.getByLabel("Contact phone *", { exact: true }).fill("+2348012345678");
  await page.getByLabel("Contact email *", { exact: true }).fill("amina@example.com");
  await page.getByLabel("Registration date *", { exact: true }).fill("2026-11-12");
  await page.getByLabel("Office *", { exact: true }).selectOption("Lagos");
  await page.locator('input[type="file"]').setInputFiles({ name: "certificate.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-test") });
  await expect(page.getByText("File saved securely.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Submit issue details", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/2$/);
  await expect(page.getByText("Settling issue", { exact: true }).first()).toBeVisible();
  await openNav(page, "Your orders");
  await expect(page).toHaveURL(/\/dashboard\/orders$/);
  await expect(page.getByText("Settling issue", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resolve issue", exact: true })).toHaveCount(0);
});
