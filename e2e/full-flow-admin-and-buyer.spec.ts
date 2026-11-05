import { test, expect, type APIRequestContext, type Browser } from "@playwright/test";
import { createHash } from "crypto";

/**
 * End-to-end flow, admin + buyer, against the LOCAL dev server and LOCAL database.
 *
 *  1. Admin API is closed to anonymous visitors.
 *  2. Admin logs in, creates a product and a coupon (stored in the database).
 *  3. The product shows up in the admin panel and on the storefront.
 *  4. Buyer adds it to the bag, checks out with the coupon; the server prices the order.
 *  5. Server-side protections: tampered prices ignored, missing contact rejected,
 *     payment needs the checkout token.
 *  6. Midtrans Core API: switching method creates a new charge, notifications from
 *     an old or expired charge never cancel the order, status endpoint resumes
 *     instructions; signed webhook marks the order paid; bad signatures are
 *     rejected; replays are idempotent; stock is reduced.
 *  7. Admin sees the paid order; buyer can track it.
 *  8. Cleanup: test product + coupon are removed.
 *
 * Needs in .env: E2E_TEST_ADMIN_EMAIL / E2E_TEST_ADMIN_PASSWORD (an admin account),
 * and MIDTRANS_SERVER_KEY (sandbox) for the payment steps.
 * Shipping rates are mocked in the browser so RajaOngkir quota isn't used.
 */

const ADMIN_EMAIL = process.env.E2E_TEST_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.E2E_TEST_ADMIN_PASSWORD || "";
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY?.trim() || "";

const RUN_ID = Date.now().toString().slice(-7);
const PRODUCT_NAME = `E2E Test Bag ${RUN_ID}`;
const PRODUCT_SKU = `E2E-${RUN_ID}`;
const PRODUCT_PRICE = 150_000;
const PRODUCT_STOCK = 10;
const COUPON_CODE = `E2E${RUN_ID}`;
const SHIPPING_COST = 20_000;
const BUYER_EMAIL = `e2e-buyer-${RUN_ID}@example.com`;
const BUYER_PHONE = "081234567890";

type State = {
  productId?: string;
  productSlug?: string;
  couponId?: string;
  orderNumber?: string;
  checkoutToken?: string;
  totalAmount?: number;
};
const state: State = {};

let admin: APIRequestContext;

async function loginAsAdmin(browser: Browser): Promise<APIRequestContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/login");
  await page.waitForLoadState("networkidle").catch(() => {});
  const emailInput = page.locator("input[type='email'], input[name='email']");
  await emailInput.fill(ADMIN_EMAIL);
  await expect(emailInput).toHaveValue(ADMIN_EMAIL);
  const passwordInput = page.locator("input[type='password'], input[name='password']");
  await passwordInput.fill(ADMIN_PASSWORD);
  await expect(passwordInput).toHaveValue(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Masuk ke Dashboard|Login/i }).click();
  await page.waitForURL("**/admin/dashboard", { timeout: 30_000 });
  // Reuse the admin session cookies for API calls.
  return context.request;
}

const signature = (orderId: string, statusCode: string, grossAmount: string) =>
  createHash("sha512").update(orderId + statusCode + grossAmount + SERVER_KEY).digest("hex");

test.describe.serial("E2E: admin setup → buyer checkout → payment → admin & tracking", () => {
  test.beforeAll(async ({ browser }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "E2E_TEST_ADMIN_EMAIL / PASSWORD belum di-set di .env");
    admin = await loginAsAdmin(browser);
  });

  test.afterAll(async () => {
    if (!admin) return;
    if (state.couponId) await admin.delete(`/api/admin/coupons/${state.couponId}`).catch(() => {});
    if (state.productId) await admin.delete(`/api/admin/products/${state.productId}`).catch(() => {});
    await admin.dispose();
  });

  test("1. admin API & pages tertutup untuk pengunjung tanpa login", async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL });
    for (const path of ["/api/admin/orders", "/api/admin/products", "/api/admin/coupons"]) {
      const res = await anon.get(path);
      expect(res.status(), path).toBe(401);
    }
    const create = await anon.post("/api/admin/products", {
      data: { name: "hack", sku: "HACK", price: 1 },
    });
    expect(create.status()).toBe(401);
    await anon.dispose();
  });

  test("2. admin membuat produk dan kupon di database", async () => {
    const productRes = await admin.post("/api/admin/products", {
      data: {
        name: PRODUCT_NAME,
        sku: PRODUCT_SKU,
        description: "Produk otomatis dari E2E test. Aman dihapus.",
        price: PRODUCT_PRICE,
        stock: PRODUCT_STOCK,
        isActive: true,
        isNewArrival: true,
        images: [],
        variants: [],
      },
    });
    expect(productRes.status(), await productRes.text()).toBe(201);
    const { product } = await productRes.json();
    state.productId = product.id;
    state.productSlug = product.slug;

    const couponRes = await admin.post("/api/admin/coupons", {
      data: {
        code: COUPON_CODE,
        name: "E2E Coupon",
        discountType: "PERCENTAGE",
        discountValue: 10,
        minSpend: 0,
        usageLimit: 5,
        isActive: true,
      },
    });
    expect(couponRes.ok(), await couponRes.text()).toBeTruthy();
    const couponJson = await couponRes.json();
    state.couponId = couponJson.coupon?.id ?? couponJson.id;
    expect(state.couponId).toBeTruthy();
  });

  test("3. produk tampil di admin panel dan di toko", async ({ browser, page }) => {
    // Admin panel (same session as the API context)
    const adminPage = await browser.newPage({ storageState: await admin.storageState() });
    await adminPage.goto("/admin/products");
    await expect(adminPage.getByText(PRODUCT_NAME).first()).toBeVisible({ timeout: 20_000 });
    await adminPage.close();

    // Storefront
    await page.goto(`/products/${state.productSlug}`);
    await expect(page.getByRole("heading", { name: PRODUCT_NAME }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Bag", exact: true })).toBeEnabled();
  });

  test("4. pembeli checkout dengan kupon, harga dihitung server", async ({ page }) => {
    // Deterministic shipping rate (no RajaOngkir quota used)
    await page.route("**/api/shipping/cost", (route) =>
      route.fulfill({
        json: {
          provider: "rajaongkir",
          rates: [
            {
              id: "jne-reg-e2e",
              courier: "JNE",
              courierName: "JNE",
              name: "JNE REG",
              cost: SHIPPING_COST,
              estimatedDays: "2-3 hari",
            },
          ],
        },
      })
    );

    await page.goto(`/products/${state.productSlug}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Add to Bag", exact: true }).click();
    await expect(page.getByText(/Added to Bag/i).first()).toBeVisible();

    await page.goto("/checkout");
    await expect(page.getByText(PRODUCT_NAME).first()).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder(/Email address/i).fill(BUYER_EMAIL);
    await page.getByPlaceholder("Nama depan").fill("E2E");
    await page.getByPlaceholder("Nama belakang").fill("Buyer");
    await page.getByPlaceholder(/Alamat jalan lengkap/i).fill("Jl. Pengujian No. 1");
    await page.getByPlaceholder(/Kota Tujuan/i).fill("Bandung");
    await page.locator("#checkout-province").selectOption("West Java");
    await page.getByPlaceholder("Kode pos").fill("40281");
    await page.getByPlaceholder(/Nomor Handphone/i).fill(BUYER_PHONE);

    await page.getByPlaceholder(/Kode kupon/i).fill(COUPON_CODE);
    await page.getByRole("button", { name: "Pakai", exact: true }).click();
    await expect(page.getByText(COUPON_CODE).first()).toBeVisible();

    await expect(page.getByText("JNE REG").first()).toBeVisible({ timeout: 15_000 });

    const orderResPromise = page.waitForResponse(
      (r) => r.url().endsWith("/api/orders") && r.request().method() === "POST"
    );
    const payResPromise = page.waitForResponse((r) => r.url().includes("/api/payment/charge"));

    await page.getByTestId("pay-method-qris").click();
    const payBtn = page.locator("button[type='submit']").filter({ hasText: /Bayar dengan QRIS/i });
    await expect(payBtn).toBeEnabled({ timeout: 15_000 });
    await payBtn.click();

    const orderRes = await orderResPromise;
    expect(orderRes.status(), await orderRes.text()).toBe(201);
    const orderJson = await orderRes.json();
    state.orderNumber = orderJson.order.orderNumber;
    state.checkoutToken = orderJson.checkoutToken;
    state.totalAmount = orderJson.pricing.totalAmount;

    const p = orderJson.pricing;
    expect(p.subtotal).toBe(PRODUCT_PRICE);
    expect(p.couponCode).toBe(COUPON_CODE);
    expect(p.couponDiscount).toBe(PRODUCT_PRICE * 0.1);
    expect(p.shippingCost).toBe(SHIPPING_COST);
    expect(p.totalAmount).toBe(p.subtotal - p.discountAmount + p.shippingCost);
    expect(orderJson.order.paymentStatus).toBe("PENDING");
    expect(orderJson.order.customerEmail).toBe(BUYER_EMAIL);

    const payRes = await payResPromise;
    if (SERVER_KEY) {
      // Core API charge → our own payment page renders the QRIS code
      expect(payRes.status(), await payRes.text()).toBe(200);
      const pay = await payRes.json();
      expect(pay.instructions.method).toBe("qris");
      expect(pay.instructions.midtransOrderId).toBe(state.orderNumber);
      expect(pay.instructions.amount).toBe(state.totalAmount);
      await expect(page.getByTestId("payment-step")).toBeVisible();
      await expect(page.getByTestId("qr-image")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("payment-waiting")).toBeVisible();
      expect(page.url()).toContain("/checkout");

      // Switch method in the UI: BCA VA number appears
      await page.getByRole("button", { name: "Ganti metode" }).click();
      await page.getByTestId("pay-method-bca_va").click();
      const switchRes = page.waitForResponse((r) => r.url().includes("/api/payment/charge"));
      await page.getByTestId("pay-confirm").click();
      expect((await switchRes).status()).toBe(200);
      await expect(page.getByTestId("va-number")).toBeVisible();
    }
  });

  test("5. proteksi server: harga palsu, data kontak, token pembayaran", async ({ request }) => {
    const base = {
      customerEmail: BUYER_EMAIL,
      customerName: "Tamper Test",
      customerPhone: BUYER_PHONE,
      shippingAddress: { recipient: "Tamper", street: "Jl. X", city: "Bandung", country: "Indonesia" },
      shippingCost: SHIPPING_COST,
      courier: "JNE",
      courierService: "JNE REG",
      items: [{ productId: state.productId, quantity: 1, unitPrice: 1, subtotal: 1 }],
      subtotal: 1,
      totalAmount: 1,
      discountAmount: 0,
    };

    // Missing contact → rejected
    const noEmail = await request.post("/api/orders", { data: { ...base, customerEmail: "" } });
    expect(noEmail.status()).toBe(400);

    // Tampered prices → ignored, server uses DB price
    const tampered = await request.post("/api/orders", {
      data: { ...base, orderNumber: `ZDC-T${RUN_ID}` },
    });
    expect(tampered.status(), await tampered.text()).toBe(201);
    const t = await tampered.json();
    expect(t.pricing.subtotal).toBe(PRODUCT_PRICE);
    expect(t.order.items[0].unitPrice).toBe(PRODUCT_PRICE);

    // Buyer can't mark their own order paid
    const fakePaid = await request.post("/api/orders", {
      data: { ...base, orderNumber: `ZDC-P${RUN_ID}`, paymentStatus: "SETTLEMENT", orderStatus: "PAID" },
    });
    expect((await fakePaid.json()).order.paymentStatus).toBe("PENDING");

    // Payment needs the secret checkout token
    const noToken = await request.post("/api/payment/charge", {
      data: { orderNumber: state.orderNumber, method: "qris" },
    });
    expect([403, 503]).toContain(noToken.status());
    const wrongToken = await request.post("/api/payment/charge", {
      data: { orderNumber: state.orderNumber, checkoutToken: "0".repeat(48), method: "qris" },
    });
    expect([403, 503]).toContain(wrongToken.status());
    const statusNoToken = await request.post("/api/payment/status", {
      data: { orderNumber: state.orderNumber },
    });
    expect(statusNoToken.status()).toBe(403);
    const badMethod = await request.post("/api/payment/charge", {
      data: { orderNumber: state.orderNumber, checkoutToken: state.checkoutToken, method: "credit_card" },
    });
    expect(badMethod.status()).toBe(400);
  });

  test("6. webhook Midtrans: tanda tangan palsu ditolak, settlement menandai lunas", async ({ request }) => {
    test.skip(!SERVER_KEY, "MIDTRANS_SERVER_KEY belum di-set di .env");
    const orderId = state.orderNumber!;
    const gross = `${state.totalAmount}.00`;
    const notify = (id: string, status: string) =>
      request.post("/api/payment/webhook", {
        data: {
          order_id: id,
          status_code: status === "settlement" ? "200" : "202",
          gross_amount: gross,
          transaction_status: status,
          payment_type: "qris",
          signature_key: signature(id, status === "settlement" ? "200" : "202", gross),
        },
      });
    const orderState = async () => {
      const { orders } = await (await admin.get("/api/admin/orders")).json();
      return orders.find((o: { orderNumber: string }) => o.orderNumber === orderId);
    };

    // The UI switched QRIS (orderId) -> BCA VA (orderId-2). The old charge's
    // expire notification must be ignored.
    const stale = await notify(orderId, "expire");
    expect(stale.status(), await stale.text()).toBe(200);
    expect((await stale.json()).status).toBe("ignored");
    expect((await orderState()).orderStatus).toBe("PENDING");

    // The current charge expiring (e.g. a QR after 30 min) keeps the order payable
    const expired = await notify(`${orderId}-2`, "expire");
    expect(expired.status()).toBe(200);
    let o = await orderState();
    expect(o.orderStatus).toBe("PENDING");
    expect(o.paymentStatus).toBe("EXPIRE");

    // A new charge gets the next id; the status endpoint resumes its instructions
    const recharge = await request.post("/api/payment/charge", {
      data: { orderNumber: orderId, checkoutToken: state.checkoutToken, method: "qris" },
    });
    expect(recharge.status(), await recharge.text()).toBe(200);
    expect((await recharge.json()).instructions.midtransOrderId).toBe(`${orderId}-3`);
    const status = await request.post("/api/payment/status", {
      data: { orderNumber: orderId, checkoutToken: state.checkoutToken },
    });
    const statusJson = await status.json();
    expect(statusJson.paymentStatus).toBe("PENDING");
    expect(statusJson.instructions?.qrUrl).toBeTruthy();

    const forged = await request.post("/api/payment/webhook", {
      data: {
        order_id: orderId,
        status_code: "200",
        gross_amount: gross,
        transaction_status: "settlement",
        signature_key: "deadbeef",
      },
    });
    expect(forged.status()).toBe(401);

    const paidId = `${orderId}-3`;
    const notification = {
      order_id: paidId,
      status_code: "200",
      gross_amount: gross,
      transaction_status: "settlement",
      fraud_status: "accept",
      payment_type: "bank_transfer",
      transaction_id: `e2e-${RUN_ID}`,
      signature_key: signature(paidId, "200", gross),
    };
    const ok = await request.post("/api/payment/webhook", { data: notification });
    expect(ok.status(), await ok.text()).toBe(200);

    // Replay is harmless
    const replay = await request.post("/api/payment/webhook", { data: notification });
    expect(replay.status()).toBe(200);

    // A late expire from an older charge never downgrades a paid order
    await notify(`${orderId}-2`, "expire");
    o = await orderState();
    const order = o;
    expect(order, "order tersimpan di database").toBeTruthy();
    expect(order.paymentStatus).toBe("SETTLEMENT");
    expect(order.orderStatus).toBe("PAID");
    expect(order.couponCode).toBe(COUPON_CODE);

    // Stock reduced exactly once
    const productRes = await admin.get(`/api/admin/products/${state.productId}`);
    const productJson = await productRes.json();
    const stock = (productJson.product ?? productJson).stock;
    expect(stock).toBe(PRODUCT_STOCK - 1);

    // Status endpoint agrees and a new charge is refused
    const after = await request.post("/api/payment/status", {
      data: { orderNumber: orderId, checkoutToken: state.checkoutToken },
    });
    expect((await after.json()).paymentStatus).toBe("SETTLEMENT");
    const again = await request.post("/api/payment/charge", {
      data: { orderNumber: orderId, checkoutToken: state.checkoutToken, method: "qris" },
    });
    expect(again.status()).toBe(409);
  });

  test("7. admin melihat pesanan, pembeli bisa melacak", async ({ browser, page }) => {
    const adminPage = await browser.newPage({ storageState: await admin.storageState() });
    await adminPage.goto("/admin/orders");
    await expect(adminPage.getByText(state.orderNumber!).first()).toBeVisible({ timeout: 20_000 });
    await adminPage.close();

    const lookup = await page.request.post("/api/tracking/lookup", {
      data: { orderId: state.orderNumber, email: BUYER_EMAIL },
    });
    expect(lookup.status()).toBe(200);
    expect((await lookup.json()).order.orderNumber).toBe(state.orderNumber);

    const wrongEmail = await page.request.post("/api/tracking/lookup", {
      data: { orderId: state.orderNumber, email: "orang-lain@example.com" },
    });
    expect(wrongEmail.status()).toBe(403);
  });
});
