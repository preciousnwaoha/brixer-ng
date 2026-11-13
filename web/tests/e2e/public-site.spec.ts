import { expect, test } from "@playwright/test";

test("homepage browsing scrolls to services and exposes filters", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Register. Protect. Grow.", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Browse services", exact: true }).click();
  await expect(page).toHaveURL(/\/#services$/);
  await expect(page.getByRole("heading", { name: "Every compliance service your business needs." })).toBeVisible();
  await expect(page.getByRole("button", { name: "All services", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
});

test("multiple services persist across navigation and can be reviewed in the cart", async ({ page }) => {
  await page.goto("/#services");
  const business = page.locator("article").filter({ has: page.getByRole("heading", { name: "Business Name (BN)", exact: true }) });
  await business.getByRole("button", { name: "Select service", exact: true }).click();
  await business.getByRole("button", { name: "Add one Business Name (BN)", exact: true }).click();
  await page.getByRole("button", { name: "Tax & finance", exact: true }).click();
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "TIN Retrieval", exact: true }) }).getByRole("button", { name: "Select service", exact: true }).click();
  await expect(page.getByRole("link", { name: "Cart, 3 items", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Continue · 3 items", exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole("heading", { name: "Review your services." })).toBeVisible();
  await expect(page.getByText("₦75,000", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tax ID Retrieval", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove TIN Retrieval from cart", exact: true }).click();
  await expect(page.getByText("₦70,000", { exact: true }).last()).toBeVisible();
  await page.getByRole("link", { name: "Start the service(s)", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("mobile navigation opens accessibly and cart stays reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(nav).toBeVisible();
  for (const label of ["Services", "How it works", "Bank Account", "Our Office", "Reviews", "Contact"]) await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart, 0 items", exact: true })).toBeVisible();
});

test("mixed half checkout explains ineligible items and opens hosted payment as guest", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("brixer-cart-v1", JSON.stringify([{ serviceCode: "LTD", quantity: 1 }, { serviceCode: "TIN", quantity: 1 }])));
  await page.route("**/api/checkout/initialize", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.items).toHaveLength(2);
    expect(body.expectedDueNowKobo).toBe(3500000);
    expect(body.phone).toBe("+2348012345678");
    expect(body.whatsappConsent).toBe(true);
    return route.fulfill({ json: { reference: "BRX-TEST-123", authorizationUrl: "https://checkout.paystack.com/brixer-test" } });
  });
  await page.route("https://checkout.paystack.com/brixer-test", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Secure Paystack checkout</h1>" }));
  await page.goto("/checkout");
  await page.getByLabel("Full name", { exact: true }).fill("Amina Bello");
  await page.getByLabel("Contact Email", { exact: true }).fill("amina@example.com");
  await page.getByLabel("Phone / WhatsApp number").fill("08012345678");
  await expect(page.getByLabel("I will receive my order updates on this WhatsApp number.")).toBeChecked();
  await page.getByRole("button", { name: /^Half payment/ }).click();
  await expect(page.getByText("50% upfront", { exact: false })).toBeVisible();
  await expect(page.getByText("₦5,000 each · Full payment", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Continue to secure payment/ }).click();
  await expect(page).toHaveURL("https://checkout.paystack.com/brixer-test");
});

test("balance payments open hosted Paystack checkout", async ({ page }) => {
  await page.route("**/api/orders/balance", (route) => route.fulfill({ json: { reference: "BRX-BAL-TEST", authorizationUrl: "https://checkout.paystack.com/brixer-balance" } }));
  await page.route("https://checkout.paystack.com/brixer-balance", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Secure Paystack checkout</h1>" }));
  await page.goto("/dashboard/orders/1/balance");
  await page.getByLabel("Email address").fill("customer@example.com");
  await page.getByRole("button", { name: /Pay ₦30,000 securely/ }).click();
  await expect(page).toHaveURL("https://checkout.paystack.com/brixer-balance");
});

test("login detects email and phone and safely offers first password setup", async ({ page }) => {
  await page.route("**/api/auth/action", async (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({ json: body.action === "inspect" ? { hasPassword: false } : body.action === "phone" ? { otpSent: true, phone: "+2348012345678" } : { message: "Check your email for a secure link." } });
  });
  await page.goto("/login");
  const input = page.getByLabel("Email / Phone (WhatsApp)", { exact: true });
  await expect(page.getByRole("button", { name: "Get login link / OTP", exact: true })).toBeDisabled();
  await input.fill("customer@example.com");
  await expect(page.getByRole("button", { name: "Get login link", exact: true })).toBeEnabled();
  await input.fill("08012345678");
  await page.getByRole("button", { name: "Get login OTP", exact: true }).click();
  await expect(page.getByLabel("Login OTP", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Checkout email", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Use email and password", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("customer@example.com");
  await expect(page.getByLabel("Set password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Get password setup link", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Forgot password?", exact: true })).toHaveCount(0);
});

test("success URL cannot manufacture a successful payment", async ({ page }) => {
  await page.goto("/payment/success");
  await expect(page.getByRole("heading", { name: "Payment not confirmed." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to dashboard" })).toHaveCount(0);
});

test("preview dashboards expose service workspaces without fabricated documents", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "View order", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Issues and additional information", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
  await expect(page.getByText("Documents will appear here as they are uploaded.", { exact: true })).toBeVisible();
});
