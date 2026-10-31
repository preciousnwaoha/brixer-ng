import { expect, test } from "@playwright/test";

test("public site presents the complete conversion path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Register. Protect. Grow.", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Browse services" }).click();
  await expect(page).toHaveURL(/\/services/);
  await expect(page.getByRole("heading", { name: /Every essential next step/i })).toBeVisible();
});

test("mobile navigation opens accessibly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
});

test("a guest can begin payment without signing in", async ({ page }) => {
  await page.route("**/api/checkout/initialize", (route) => route.fulfill({ json: { reference: "BRX-TEST-123", authorizationUrl: "https://checkout.paystack.com/brixer-test" } }));
  await page.route("https://checkout.paystack.com/brixer-test", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Secure Paystack checkout</h1>" }));
  await page.goto("/checkout/limited-company");
  await page.getByLabel("Full name").fill("Amina Bello");
  await page.getByLabel("Email address").fill("amina@example.com");
  await page.getByLabel("Phone / WhatsApp number").fill("08012345678");
  await page.getByRole("button", { name: /Pay 50% now/ }).click();
  await page.getByRole("button", { name: /Continue to secure payment/ }).click();
  await expect(page).toHaveURL("https://checkout.paystack.com/brixer-test");
  await expect(page.getByRole("heading", { name: "Secure Paystack checkout" })).toBeVisible();
});

test("balance payments open hosted Paystack checkout", async ({ page }) => {
  await page.route("**/api/orders/balance", (route) => route.fulfill({ json: { reference: "BRX-BAL-TEST", authorizationUrl: "https://checkout.paystack.com/brixer-balance" } }));
  await page.route("https://checkout.paystack.com/brixer-balance", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Secure Paystack checkout</h1>" }));
  await page.goto("/dashboard/orders/1/balance");
  await page.getByLabel("Email address").fill("customer@example.com");
  await page.getByRole("button", { name: /Pay ₦30,000 securely/ }).click();
  await expect(page).toHaveURL("https://checkout.paystack.com/brixer-balance");
});

test("opening the success URL directly does not claim a successful payment", async ({ page }) => {
  await page.goto("/payment/success");
  await expect(page.getByRole("heading", { name: "Payment not confirmed." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue to dashboard" })).toHaveCount(0);
});
