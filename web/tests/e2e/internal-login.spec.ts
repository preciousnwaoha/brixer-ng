import { expect, test } from "@playwright/test";

for (const entry of [{ path: "/login", title: "Welcome to Brixer." }, { path: "/admin/login", title: "Team login." }, { path: "/staff/login", title: "Staff login." }]) {
  test(`${entry.path} shows the shared branding and no preview shortcuts`, async ({ page }) => {
    await page.goto(entry.path);
    await expect(page.getByRole("heading", { name: entry.title, exact: true })).toBeVisible();
    await expect(page.getByText("Preview dashboards", { exact: true })).toHaveCount(0);
    const logo = page.locator('a[aria-label="Brixer home"]:visible').first();
    await expect(logo.getByText("The Brand Fixer", { exact: true })).toBeVisible();
    const icon = page.getByRole("button", { name: "Continue with Google", exact: true }).locator("svg");
    await expect(icon).toHaveAttribute("width", "18"); await expect(icon.locator("path")).toHaveCount(4);
    const fills = await icon.locator("path").evaluateAll((paths) => paths.map((path) => getComputedStyle(path).fill));
    expect(fills).toEqual(["rgb(234, 67, 53)", "rgb(66, 133, 244)", "rgb(251, 188, 5)", "rgb(52, 168, 83)"]);
    const bounds = await logo.evaluate((node) => { const wordmark = node.querySelector("span.flex")!; const [title, tagline] = [...wordmark.children].map((child) => child.getBoundingClientRect()); return { titleBottom: title.bottom, taglineTop: tagline.top, titleLeft: title.left, taglineLeft: tagline.left }; });
    expect(bounds.taglineTop).toBeGreaterThanOrEqual(bounds.titleBottom); expect(bounds.taglineLeft).toBe(bounds.titleLeft);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

for (const entry of [{ path: "/admin", login: "/admin/login" }, { path: "/admin/settings", login: "/admin/login" }, { path: "/staff/orders/any-item", login: "/staff/login" }]) {
  test(`anonymous visitors cannot preview ${entry.path}`, async ({ page }) => {
    await page.goto(entry.path);
    await expect(page).toHaveURL((url) => url.pathname === entry.login);
    expect(new URL(page.url()).searchParams.get("next")).toBe(entry.path);
    await expect(page.getByRole("button", { name: "Get login link / OTP", exact: true })).toBeVisible();
  });
}

test("internal APIs reject unauthenticated access", async ({ request }) => {
  for (const path of ["/api/dashboard/admin", "/api/dashboard/staff", "/api/admin/settings", "/api/admin/payments", "/api/admin/team", "/api/admin/notifications/history"]) {
    const response = await request.get(path); expect([401, 503]).toContain(response.status());
  }
});

test("team magic-link requests preserve the entry and return destination", async ({ page }) => {
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/auth/action", async (route) => { body = route.request().postDataJSON(); await route.fulfill({ json: { message: "Check your email for a secure link." } }); });
  await page.goto("/admin/login?next=%2Fadmin%2Forders%2Fjob");
  await page.getByLabel("Email / Phone (WhatsApp)", { exact: true }).fill("team@example.com");
  await page.getByRole("button", { name: "Get login link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(body).toMatchObject({ action: "link", portal: "team", next: "/admin/orders/job" });
});

test("staff password setup keeps the staff entry", async ({ page }) => {
  let body: Record<string, unknown> | undefined;
  await page.route("**/api/auth/action", async (route) => { const input = route.request().postDataJSON(); if (input.action !== "inspect") body = input; await route.fulfill({ json: input.action === "inspect" ? { hasPassword: false } : { message: "Check your email for a secure setup link." } }); });
  await page.goto("/staff/login");
  await page.getByRole("button", { name: "Use email and password", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("staff@example.com");
  await page.getByRole("button", { name: "Get password setup link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(body?.portal).toBe("staff");
  const setup = new URL(String(body?.next), "https://brixer.example");
  expect(setup.pathname).toBe("/auth/set-password"); expect(setup.searchParams.get("portal")).toBe("staff"); expect(setup.searchParams.get("next")).toBe("/staff");
});

test("a role rejection provides account switching without a redirect loop", async ({ page }) => {
  await page.route("**/api/auth/action", (route) => route.fulfill({ json: { ok: true } }));
  await page.goto("/staff/login?error=role");
  await expect(page.getByRole("status")).toContainText("required role");
  await page.getByRole("button", { name: "Switch account", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/staff/login" && !url.searchParams.has("error"));
});

test("the header logo tagline is visible on mobile, tablet, and desktop", async ({ page }, testInfo) => {
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const header = page.locator("header");
    const tagline = header.getByText("The Brand Fixer", { exact: true });
    await expect(tagline).toBeVisible();
    const style = await tagline.evaluate((element) => ({ opacity: getComputedStyle(element).opacity, height: element.getBoundingClientRect().height }));
    expect(style.opacity).toBe("1"); expect(style.height).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await header.screenshot({ path: testInfo.outputPath(`header-${width}.png`) });
  }
});
