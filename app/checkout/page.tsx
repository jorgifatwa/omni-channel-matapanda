"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  ChevronDown,
  CircleHelp,
  Truck,
  RefreshCw,
  MapPin,
  CheckCircle,
  Clock,
  CreditCard,
  Ticket,
  Mail,
  Sparkles,
  Gift,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart, type CartItem } from "@/context/CartContext";
import { NEW_ARRIVAL_PRODUCTS, type CurrencyCode } from "@/lib/products";
import { saveOrderLocally } from "@/context/AdminStoreContext";
import { type AdminOrder } from "@/lib/admin-data";

interface ShippingOption {
  service: string;
  name: string;
  cost: number;
  currency: "IDR";
  estimatedDays: string;
  description?: string;
}

const FALLBACK_ITEM: CartItem = {
  key: "dawn-gong-sunburn-01-t-shirt__M__White",
  productId: NEW_ARRIVAL_PRODUCTS[0].id,
  name: NEW_ARRIVAL_PRODUCTS[0].name,
  price: NEW_ARRIVAL_PRODUCTS[0].price,
  priceNumber: NEW_ARRIVAL_PRODUCTS[0].priceNumber,
  image: NEW_ARRIVAL_PRODUCTS[0].image,
  size: "M",
  color: "White",
  quantity: 1,
};

function formatCheckoutPrice(amountInIDR: number, currency: CurrencyCode) {
  switch (currency) {
    case "USD":
      return `$${(amountInIDR / 15800).toFixed(2)}`;
    case "SGD":
      return `S$${(amountInIDR / 11800).toFixed(2)}`;
    case "JPY":
      return `¥${Math.round(amountInIDR / 105).toLocaleString("en-US")}`;
    case "IDR":
    default:
      return `Rp ${amountInIDR.toLocaleString("id-ID")},00`;
  }
}

export default function CheckoutPage() {
  const {
    items,
    currency,
    clearCart,
    appliedCoupon,
    couponDiscount,
    bundleDiscount,
    appliedBundle,
    giftItem,
    totalDiscount,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const checkoutItems = React.useMemo(() => {
    const base = items.length > 0 ? items : [FALLBACK_ITEM];
    if (giftItem) {
      return [...base, giftItem];
    }
    return base;
  }, [items, giftItem]);

  const checkoutSubtotal = checkoutItems.reduce(
    (sum, item) => sum + item.priceNumber * item.quantity,
    0
  );

  const { data: session } = useSession();

  // Customer & Address Form States
  const [country, setCountry] = React.useState("Indonesia");
  const [province, setProvince] = React.useState("Jakarta");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [apartment, setApartment] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    if (session?.user) {
      if (session.user.email && !email) {
        setEmail(session.user.email);
      }
      if (session.user.name && !firstName) {
        const parts = session.user.name.trim().split(" ");
        setFirstName(parts[0] || "");
        if (parts.length > 1 && !lastName) {
          setLastName(parts.slice(1).join(" "));
        }
      }
    }
  }, [session, email, firstName, lastName]);

  const [discountCode, setDiscountCode] = React.useState("");
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = React.useState(false);

  const handleApplyCheckoutCoupon = async () => {
    if (!discountCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    const res = await applyCoupon(discountCode);
    setIsApplyingCoupon(false);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setDiscountCode("");
    }
  };

  // Order & Payment States
  const [createdOrder, setCreatedOrder] = React.useState<AdminOrder | null>(
    null
  );
  const [orderSuccess, setOrderSuccess] = React.useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);

  // Shipping Calculation States
  const [shippingRates, setShippingRates] = React.useState<ShippingOption[]>([]);
  const [selectedRate, setSelectedRate] = React.useState<ShippingOption | null>(
    null
  );
  const [isLoadingShipping, setIsLoadingShipping] = React.useState(false);
  const [shippingProvider, setShippingProvider] = React.useState<string>("");

  const isDomestic = country === "Indonesia";

  // Debounced auto-fetch shipping costs when country, province, or city changes
  React.useEffect(() => {
    let isCancelled = false;

    async function fetchShippingCost() {
      // Only fetch if city or address is being entered
      if (!city || city.trim().length < 2) {
        setShippingRates([]);
        setSelectedRate(null);
        return;
      }

      setIsLoadingShipping(true);
      try {
        const res = await fetch("/api/shipping/cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationCountry: country,
            destinationCountryCode: isDomestic ? "ID" : "INTL",
            destinationProvince: province,
            destinationCity: city,
            weightGrams: 500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.rates && data.rates.length > 0) {
            setShippingRates(data.rates);
            setSelectedRate(data.rates[0]);
            setShippingProvider(data.provider || "");
          }
        }
      } catch (err) {
        console.error("Failed to calculate shipping:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingShipping(false);
        }
      }
    }

    const timer = setTimeout(fetchShippingCost, 350);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [country, province, city, isDomestic]);

  // When changing country, reset city and trigger appropriate courier
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setCity("");
    setShippingRates([]);
    setSelectedRate(null);
    if (newCountry === "Indonesia") {
      setProvince("Jakarta");
    } else {
      setProvince("");
    }
  };

  const shippingCost = selectedRate ? selectedRate.cost : 0;
  const grandTotal = Math.max(0, checkoutSubtotal - totalDiscount) + shippingCost;
  const isShippingReady = !isLoadingShipping && selectedRate !== null;
  const isPayDisabled = isProcessingPayment || !isShippingReady;

  // Handle Form Submission / Midtrans Checkout
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isShippingReady || isProcessingPayment) {
      return;
    }
    setIsProcessingPayment(true);

    const orderNumber = `ZDC-${Date.now().toString().slice(-8)}`;
    const courierType = isDomestic ? "JNE" : "DHL";
    const courierService = selectedRate
      ? selectedRate.name
      : isDomestic
      ? "JNE REG"
      : "DHL Express Worldwide";
    const trackingNumber = isDomestic
      ? `JNE0098${Math.floor(10000000 + Math.random() * 90000000)}`
      : `DHL${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const newOrder: AdminOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: `cust-${Date.now()}`,
      customerName: `${firstName} ${lastName}`.trim() || "Customer it's matapanda",
      customerEmail: email || "customer@itsmatapanda.com",
      customerPhone: phone || "+62 812-3456-7890",
      shippingAddress: {
        recipient: `${firstName} ${lastName}`.trim() || "Customer it's matapanda",
        phone: phone || "+62 812-3456-7890",
        street: address || "Jl. Senopati No. 64",
        city: city || (isDomestic ? "Jakarta Selatan" : "Singapore"),
        province: province || (isDomestic ? "Jakarta" : "Central Region"),
        postalCode: postalCode || "12190",
        country,
      },
      subtotal: checkoutSubtotal,
      shippingCost,
      discountAmount: totalDiscount,
      totalAmount: grandTotal,
      paymentMethod: "Midtrans Snap (VA / QRIS / Credit Card)",
      midtransTransactionId: `MT-TRX-${Date.now().toString().slice(-9)}`,
      paymentStatus: "PENDING",
      orderStatus: "PENDING",
      shipmentStatus: "PENDING",
      courier: courierType,
      courierService,
      trackingNumber,
      items: checkoutItems.map((it, idx) => ({
        id: `oi-${Date.now()}-${idx}`,
        productId: it.productId,
        productName: it.name,
        sku: `${it.productId.toUpperCase().slice(0, 8)}-${it.size}`,
        image: it.image,
        size: it.size,
        color: it.color,
        unitPrice: it.priceNumber,
        quantity: it.quantity,
        subtotal: it.priceNumber * it.quantity,
      })),
      trackingHistory: [
        {
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
          status: "PENDING",
          description: `Order berhasil dibuat. Menunggu penyelesaian pembayaran tagihan via Midtrans.`,
          location: isDomestic ? "Jakarta Selatan (Origin)" : "Jakarta International Gateway",
        },
      ],
      createdAt: new Date().toISOString().slice(0, 10),
    };

    try {
      // 1. Inisiasi Transaksi Midtrans Snap
      const res = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderNumber,
          grossAmount: grandTotal,
          customerDetails: {
            firstName: firstName || "Customer",
            lastName: lastName || "it's matapanda",
            email: email || "customer@itsmatapanda.com",
            phone: phone || "+6281234567890",
            shippingAddress: {
              address,
              city,
              postal_code: postalCode,
              country_code: isDomestic ? "IDN" : "SGP",
            },
          },
          itemDetails: [
            ...checkoutItems.map((it) => ({
              id: it.productId,
              price: it.priceNumber,
              quantity: it.quantity,
              name: it.name.slice(0, 50),
            })),
            ...(bundleDiscount > 0
              ? [
                  {
                    id: "BUNDLE-DISCOUNT",
                    price: -bundleDiscount,
                    quantity: 1,
                    name: `Paket Diskon: ${appliedBundle?.name || "Min. Belanja"}`.slice(0, 50),
                  },
                ]
              : []),
            ...(couponDiscount > 0
              ? [
                  {
                    id: "COUPON-DISCOUNT",
                    price: -couponDiscount,
                    quantity: 1,
                    name: `Kupon: ${appliedCoupon?.code || "Voucher Promo"}`.slice(0, 50),
                  },
                ]
              : []),
            ...(shippingCost > 0
              ? [
                  {
                    id: "SHIPPING-FEE",
                    price: shippingCost,
                    quantity: 1,
                    name: `Shipping: ${courierService}`.slice(0, 50),
                  },
                ]
              : []),
          ],
        }),
      });

      // 2. Simpan order ke local store (Status awal PENDING - Belum Kirim Email Bukti Lunas)
      saveOrderLocally(newOrder);
      setCreatedOrder(newOrder);

      // 3. Catat pemakaian kupon jika ada
      if (appliedCoupon) {
        fetch("/api/coupons/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: appliedCoupon.code }),
        }).catch(() => {});
      }

      if (res.ok) {
        const snapRes = await res.json();
        // Jika mode live snap redirect aktif dan user ingin redirect:
        if (snapRes.redirect_url && snapRes.isLive) {
          // Simpan data order ke sessionStorage agar finish page bisa kirim email dengan data asli
          sessionStorage.setItem("pendingOrderData", JSON.stringify(newOrder));
          window.location.href = snapRes.redirect_url;
          return;
        }
        // Untuk sandbox simulation dengan redirect_url tanpa isLive:
        if (snapRes.redirect_url) {
          sessionStorage.setItem("pendingOrderData", JSON.stringify(newOrder));
          window.location.href = snapRes.redirect_url;
          return;
        }
      }

      // Tampilkan layar pesanan dibuat (Menunggu Pembayaran)
      setOrderSuccess(true);
      clearCart();
    } catch (err) {
      console.error("Payment submission error:", err);
      saveOrderLocally(newOrder);
      setCreatedOrder(newOrder);
      setOrderSuccess(true);
      clearCart();
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const [isSettlingPayment, setIsSettlingPayment] = React.useState(false);

  const handleSettlePayment = async () => {
    if (!createdOrder) return;
    setIsSettlingPayment(true);
    try {
      // Kirim email tanda terima resmi HANYA setelah status dikonfirmasi Lunas (Settlement)
      const receiptResp = await fetch("/api/payment/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: createdOrder.orderNumber,
          email: createdOrder.customerEmail,
          customerName: createdOrder.customerName,
          customerPhone: createdOrder.customerPhone,
          shippingAddress: createdOrder.shippingAddress,
          items: createdOrder.items,
          subtotal: createdOrder.subtotal,
          shippingCost: createdOrder.shippingCost,
          discountAmount: createdOrder.discountAmount,
          totalAmount: createdOrder.totalAmount,
          courier: createdOrder.courier,
          courierService: createdOrder.courierService,
          trackingNumber: createdOrder.trackingNumber,
          paymentMethod: createdOrder.paymentMethod,
          paymentStatus: "SETTLEMENT",
        }),
      });
      const receiptData = await receiptResp.json();
      console.log("[Checkout] send-receipt response:", receiptResp.status, receiptData);
      if (!receiptResp.ok) {
        console.error("[Checkout] Gagal kirim email receipt:", receiptData);
      }

      const updated: AdminOrder = {
        ...createdOrder,
        paymentStatus: "SETTLEMENT",
        orderStatus: "PAID",
        trackingHistory: [
          ...(createdOrder.trackingHistory || []),
          {
            timestamp: new Date().toISOString().replace("T", " ").slice(0, 16),
            status: "PAID",
            description: "Pembayaran terverifikasi lunas via Midtrans (Settlement). Paket pesanan disiapkan.",
            location: isDomestic ? "Jakarta Selatan (Origin)" : "Jakarta International Gateway",
          },
        ],
      };

      saveOrderLocally(updated);
      setCreatedOrder(updated);
    } catch (err) {
      console.error("Failed to settle simulated payment:", err);
    } finally {
      setIsSettlingPayment(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Top Checkout Header */}
      <header className="w-full border-b border-[#396254]/10 dark:border-neutral-800 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-4 sm:py-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl sm:text-[26px] font-black tracking-tight text-[#396254] dark:text-[#dcf58d] hover:opacity-85 transition-opacity flex items-center gap-2"
          >
            <span>it&apos;smatapanda</span>
          </Link>

          <Link
            href="/new-arrivals"
            aria-label="Back to store"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#396254]/10 dark:bg-white/10 text-[#396254] dark:text-[#d5c6ff] hover:bg-[#396254] hover:text-[#dcf58d] transition-all text-xs sm:text-sm font-bold shadow-sm"
          >
            <ShoppingBag className="h-4 w-4 stroke-[2]" />
            <span className="hidden sm:inline">Kembali ke Toko</span>
            <span className="sm:hidden">Katalog</span>
          </Link>
        </div>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Checkout Form */}
        <div className="lg:col-span-7 bg-[#fafaf8] dark:bg-neutral-950 flex justify-center lg:justify-end border-b lg:border-b-0 lg:border-r border-[#396254]/10 dark:border-neutral-800">
          <div className="w-full max-w-[760px] px-6 sm:px-10 lg:px-14 py-8 sm:py-11">
            {orderSuccess && createdOrder ? (
              createdOrder.paymentStatus === "PENDING" ? (
                /* STATE 1: MENUNGGU PEMBAYARAN (PENDING) - EMAIL BELUM DIKIRIM */
                <div className="rounded-3xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20 p-7 sm:p-10 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3.5 text-amber-600 dark:text-amber-400">
                    <div className="w-12 h-12 rounded-2xl bg-amber-200/70 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Clock className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-neutral-900 dark:text-white">
                        Menunggu Pembayaran
                      </h2>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Order ID:{" "}
                        <span className="font-mono font-bold text-neutral-900 dark:text-amber-300">
                          {createdOrder.orderNumber}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    Pesananmu telah dibuat dengan status <strong className="text-amber-800 dark:text-amber-300">Menunggu Pembayaran (Pending)</strong>. Selesaikan tagihan sebesar{" "}
                    <strong className="text-[#396254] dark:text-[#dcf58d]">{formatCheckoutPrice(createdOrder.totalAmount, currency)}</strong> via Midtrans Snap.
                  </p>

                  {/* Order Summary Box */}
                  <div className="rounded-3xl border border-amber-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 space-y-3.5 text-xs shadow-inner">
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                      <span className="text-neutral-500 font-medium">Status Pembayaran</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 font-bold text-amber-800 dark:text-amber-300 text-[11px]">
                        <Clock className="h-3 w-3" />
                        BELUM LUNAS (Pending)
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                      <span className="text-neutral-500 font-medium">Penerima</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {createdOrder.customerName} ({createdOrder.customerPhone})
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                      <span className="text-neutral-500 font-medium">Alamat Kirim</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 text-right max-w-[260px]">
                        {createdOrder.shippingAddress.street}, {createdOrder.shippingAddress.city}, {createdOrder.shippingAddress.country}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
                      <span className="text-neutral-500 font-medium">Kurir Pengiriman</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-lg">
                        {createdOrder.courier}: {createdOrder.trackingNumber}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-black text-sm">
                      <span className="text-neutral-700 dark:text-neutral-300">Total Tagihan</span>
                      <span className="text-[#396254] dark:text-[#dcf58d]">
                        {formatCheckoutPrice(createdOrder.totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Pending Notice Box */}
                  <div className="rounded-2xl bg-amber-100/70 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-800 p-4 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-3">
                    <CircleHelp className="h-5 w-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-neutral-100">Pengiriman Bukti Pembayaran:</p>
                      <p className="text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        Email invoice resmi &amp; resi pelacakan pengiriman akan otomatis dikirimkan ke{" "}
                        <strong className="text-neutral-900 dark:text-white font-mono">{createdOrder.customerEmail}</strong> setelah status transaksi terverifikasi <strong>LUNAS (Settlement)</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSettlePayment}
                      disabled={isSettlingPayment}
                      className="w-full inline-flex items-center justify-center rounded-2xl bg-[#396254] hover:bg-[#2e5044] px-6 py-4 text-sm font-bold text-[#dcf58d] transition-all shadow-md gap-2 cursor-pointer disabled:opacity-75 hover:-translate-y-0.5 active:scale-95"
                    >
                      {isSettlingPayment ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Memverifikasi Pembayaran &amp; Mengirim Email...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          <span>Simulasikan Pembayaran Lunas (Bayar Sekarang)</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/tracking?orderId=${encodeURIComponent(createdOrder.orderNumber)}`}
                      className="w-full inline-flex items-center justify-center rounded-2xl border-2 border-[#396254]/20 bg-white dark:bg-neutral-800 px-6 py-3.5 text-sm font-bold text-[#396254] dark:text-neutral-100 hover:bg-[#396254]/5 transition-all shadow-sm gap-2 hover:-translate-y-0.5 active:scale-95 text-center"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Lacak Pesanan (Status: Pending)</span>
                    </Link>

                    <Link
                      href="/new-arrivals"
                      className="w-full inline-flex items-center justify-center rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-6 py-3 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-center"
                    >
                      Kembali Belanja
                    </Link>
                  </div>
                </div>
              ) : (
                /* STATE 2: PEMBAYARAN SUDAH LUNAS (SETTLEMENT) - EMAIL SUDAH TERKIRIM */
                <div className="rounded-3xl border-2 border-[#396254]/20 bg-white dark:bg-neutral-900 p-8 sm:p-10 space-y-6 shadow-xl">
                  <div className="flex items-center gap-3.5 text-emerald-600">
                    <div className="w-14 h-14 rounded-3xl bg-[#dcf58d] text-[#396254] flex items-center justify-center shrink-0 shadow-sm rotate-[-2deg]">
                      <CheckCircle className="h-8 w-8 stroke-[2.5]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#396254] dark:text-white">
                        Pembayaran Berhasil! (Lunas)
                      </h2>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Order ID:{" "}
                        <span className="font-mono font-bold text-[#396254] dark:text-[#dcf58d]">
                          {createdOrder.orderNumber}
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    Terima kasih atas pesanan Anda! Pembayaran telah diverifikasi via{" "}
                    <strong className="text-[#396254] dark:text-[#dcf58d]">Midtrans (Settlement)</strong> dan paket Anda sedang disiapkan dengan penuh kasih sayang
                    menggunakan <strong>{createdOrder.courier} ({createdOrder.courierService})</strong>.
                  </p>

                  {/* Email Confirmation Notice Box */}
                  <div className="rounded-2xl bg-[#d5c6ff]/30 dark:bg-neutral-800 border border-[#396254]/15 p-4 text-xs text-[#396254] dark:text-[#d5c6ff] flex items-center gap-3">
                    <Mail className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-bold">Bukti pembayaran &amp; link pelacakan telah berhasil dikirim ke:</p>
                      <p className="font-mono font-black text-neutral-900 dark:text-white mt-0.5">{createdOrder.customerEmail}</p>
                    </div>
                  </div>

                  {/* Order Summary Box */}
                  <div className="rounded-3xl border border-[#396254]/10 dark:border-neutral-800 bg-[#fafaf8] dark:bg-neutral-800/60 p-6 space-y-3.5 text-xs shadow-inner">
                    <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-700 pb-2.5">
                      <span className="text-neutral-500 font-medium">Status Pembayaran</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcf58d] font-bold text-[#396254] text-[11px] shadow-sm">
                        <CheckCircle className="h-3.5 w-3.5" />
                        LUNAS (Settlement)
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-700 pb-2.5">
                      <span className="text-neutral-500 font-medium">Penerima</span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100">
                        {createdOrder.customerName} ({createdOrder.customerPhone})
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-700 pb-2.5">
                      <span className="text-neutral-500 font-medium">Alamat Kirim</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 text-right max-w-[260px]">
                        {createdOrder.shippingAddress.street}, {createdOrder.shippingAddress.city}, {createdOrder.shippingAddress.country}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200/60 dark:border-neutral-700 pb-2.5">
                      <span className="text-neutral-500 font-medium">Kurir &amp; No. Resi</span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 bg-[#d5c6ff]/30 px-2.5 py-0.5 rounded-lg">
                        {createdOrder.courier}: {createdOrder.trackingNumber}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-black text-sm">
                      <span className="text-neutral-700 dark:text-neutral-300">Total Dibayar</span>
                      <span className="text-[#396254] dark:text-[#dcf58d]">
                        {formatCheckoutPrice(createdOrder.totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    <Link
                      href={`/tracking?orderId=${encodeURIComponent(createdOrder.orderNumber)}`}
                      className="w-full inline-flex items-center justify-center rounded-2xl bg-[#396254] hover:bg-[#2e5044] px-6 py-4 text-sm font-bold text-[#dcf58d] transition-all shadow-md gap-2 hover:-translate-y-0.5 active:scale-95"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Lacak Status Pengiriman Pesanan</span>
                    </Link>

                    <Link
                      href="/new-arrivals"
                      className="w-full inline-flex items-center justify-center rounded-2xl border-2 border-[#396254]/20 bg-white dark:bg-neutral-800 px-6 py-3.5 text-sm font-bold text-[#396254] dark:text-neutral-100 hover:bg-[#396254]/5 transition-all shadow-sm gap-2 hover:-translate-y-0.5 active:scale-95 text-center"
                    >
                      <span>Lanjutkan Belanja Seru</span>
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Contact Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-black text-[#396254] dark:text-white flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>1. Informasi Kontak</span>
                    </h2>
                    {session?.user ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#396254]/10 dark:bg-neutral-800 text-[#396254] dark:text-[#dcf58d]">
                        {session.user.name || session.user.email}
                      </span>
                    ) : (
                      <Link
                        href="/account/login?callbackUrl=/checkout"
                        className="text-xs font-bold text-[#396254] dark:text-[#d5c6ff] underline underline-offset-4 hover:opacity-80"
                      >
                        Sudah punya akun? Masuk
                      </Link>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address (e.g. panda@itsmatapanda.com)"
                      className="w-full h-13 py-3.5 px-4 pr-11 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 transition-all shadow-sm"
                    />
                    <CircleHelp className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  </div>

                  <label className="mt-3.5 flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded-md accent-[#396254] text-[#396254] focus:ring-[#396254]"
                    />
                    <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-medium">
                      Kabari saya jika ada rilis merchandise baru &amp; voucher spesial
                    </span>
                  </label>
                </section>

                {/* Delivery Section */}
                <section className="mt-9">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-black text-[#396254] dark:text-white flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span>2. Alamat Pengiriman</span>
                    </h2>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#d5c6ff]/30 text-[#396254] dark:text-[#d5c6ff] flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {isDomestic ? "Domestik (JNE)" : "Internasional (DHL)"}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* Country / Region Select */}
                    <div className="relative">
                      <label
                        htmlFor="checkout-country"
                        className="block absolute top-1.5 left-4 text-[11px] text-[#396254] dark:text-neutral-400 pointer-events-none font-bold"
                      >
                        Negara / Wilayah
                      </label>
                      <select
                        id="checkout-country"
                        value={country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="appearance-none w-full h-14 pt-5 pb-1.5 px-4 pr-10 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 cursor-pointer shadow-sm font-medium"
                      >
                        <option value="Indonesia">Indonesia (Kurir JNE Express)</option>
                        <option value="Singapore">Singapore (DHL Express)</option>
                        <option value="Malaysia">Malaysia (DHL Express)</option>
                        <option value="Japan">Japan (DHL Express)</option>
                        <option value="South Korea">South Korea (DHL Express)</option>
                        <option value="United States">United States (DHL Express)</option>
                        <option value="United Kingdom">United Kingdom (DHL Express)</option>
                        <option value="Australia">Australia (DHL Express)</option>
                        <option value="Germany">Germany (DHL Express)</option>
                        <option value="France">France (DHL Express)</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    </div>

                    {/* First Name & Last Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <input
                        type="text"
                        placeholder="Nama depan"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full h-13 py-3.5 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Nama belakang"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full h-13 py-3.5 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                      />
                    </div>

                    {/* Street Address */}
                    <input
                      type="text"
                      required
                      placeholder="Alamat jalan lengkap (misal: Jl. Senopati No. 64)"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-13 py-3.5 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                    />

                    {/* Apartment, suite, etc. */}
                    <input
                      type="text"
                      placeholder="Apartemen, suite, lantai, no. unit (opsional)"
                      value={apartment}
                      onChange={(e) => setApartment(e.target.value)}
                      className="w-full h-13 py-3.5 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                    />

                    {/* City / Destination */}
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder={
                          isDomestic
                            ? "Kota Tujuan (misal: Jakarta Selatan, Bandung, Surabaya, Medan)"
                            : "City / District (e.g. Tokyo, Singapore, New York)"
                        }
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full h-13 py-3.5 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                      />
                    </div>

                    {/* Province & Postal Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {isDomestic ? (
                        <div className="relative">
                          <label
                            htmlFor="checkout-province"
                            className="block absolute top-1.5 left-4 text-[11px] text-[#396254] dark:text-neutral-400 pointer-events-none font-bold"
                          >
                            Provinsi
                          </label>
                          <select
                            id="checkout-province"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                            className="appearance-none w-full h-14 pt-5 pb-1.5 px-4 pr-10 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 cursor-pointer shadow-sm font-medium"
                          >
                            <option value="Jakarta">DKI Jakarta</option>
                            <option value="West Java">Jawa Barat</option>
                            <option value="Banten">Banten</option>
                            <option value="Central Java">Jawa Tengah</option>
                            <option value="East Java">Jawa Timur</option>
                            <option value="Bali">Bali</option>
                            <option value="North Sumatra">Sumatera Utara</option>
                            <option value="South Sulawesi">Sulawesi Selatan</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="State / Province / Region"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full h-14 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                        />
                      )}

                      <input
                        type="text"
                        required
                        placeholder="Kode pos"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full h-14 px-4 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                      />
                    </div>

                    {/* Phone */}
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="Nomor Handphone / WhatsApp"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-13 py-3.5 px-4 pr-11 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-base text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 shadow-sm"
                      />
                      <CircleHelp className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    </div>
                  </div>
                </section>

                {/* Shipping Method Section (Appears after user enters Address & City) */}
                <section className="mt-8">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-lg sm:text-xl font-black text-[#396254] dark:text-white flex items-center gap-2">
                      <Truck className="h-5 w-5 text-[#396254] dark:text-[#dcf58d]" />
                      <span>
                        3. Opsi Kurir ({isDomestic ? "JNE Express" : "DHL Express"})
                      </span>
                    </h3>
                    {isLoadingShipping && (
                      <span className="text-xs font-bold text-[#396254] dark:text-[#d5c6ff] flex items-center gap-1.5 bg-[#d5c6ff]/30 px-3 py-1 rounded-full animate-pulse">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Menghitung tarif...
                      </span>
                    )}
                  </div>

                  {/* Empty state when address/city is not filled */}
                  {!city || city.trim().length < 2 ? (
                    <div className="w-full rounded-3xl border-2 border-dashed border-[#396254]/20 bg-[#396254]/5 dark:bg-neutral-900/40 px-6 py-8 text-xs text-neutral-600 dark:text-neutral-400 text-center flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#d5c6ff]/40 flex items-center justify-center text-[#396254]">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                        Masukkan kota tujuan di atas terlebih dahulu
                      </p>
                      <p className="text-[11px] text-neutral-500 max-w-sm">
                        Opsi layanan kurir {isDomestic ? "JNE Express" : "DHL Express Worldwide"} dan ongkos kirim akan muncul otomatis di sini
                      </p>
                    </div>
                  ) : shippingRates.length === 0 && !isLoadingShipping ? (
                    <div className="w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-5 py-5 text-xs text-neutral-600 dark:text-neutral-300 text-center font-medium">
                      Tidak ditemukan tarif untuk lokasi ini. Silakan periksa kembali penulisan nama kota.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shippingRates.map((rate) => {
                        const isSelected = selectedRate?.service === rate.service;
                        return (
                          <label
                            key={rate.service}
                            onClick={() => setSelectedRate(rate)}
                            className={`flex items-center justify-between p-4.5 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#396254] bg-[#396254]/5 dark:bg-[#396254]/20 shadow-md ring-2 ring-[#d5c6ff]/40"
                                : "border-neutral-200 dark:border-neutral-800 hover:border-[#396254]/30 bg-white dark:bg-neutral-900"
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <span
                                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                                  isSelected
                                    ? "border-[#396254] bg-[#dcf58d]"
                                    : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                                }`}
                              >
                                {isSelected && <span className="h-2 w-2 rounded-full bg-[#396254]" />}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                  <span>{rate.name}</span>
                                  {isDomestic ? (
                                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#d5c6ff]/40 text-[#396254] font-bold">
                                      JNE
                                    </span>
                                  ) : (
                                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                                      DHL Air
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                  Estimasi tiba: <strong>{rate.estimatedDays}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-sm font-black text-[#396254] dark:text-[#dcf58d] block">
                                {formatCheckoutPrice(rate.cost, currency)}
                              </span>
                              {rate.cost === 0 && (
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                                  Gratis Ongkir
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {shippingProvider === "rajaongkir_starter" && (
                        <p className="text-[11px] text-neutral-400 pt-1 text-right font-medium">
                          Tarif resmi dihitung via RajaOngkir Live API (JNE)
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* Payment Section (Midtrans Snap) */}
                <section className="mt-9">
                  <h2 className="text-lg sm:text-xl font-black text-[#396254] dark:text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>4. Metode Pembayaran</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-4">
                    Seluruh transaksi aman &amp; terenkripsi resmi via Midtrans Payment Gateway.
                  </p>

                  <div className="rounded-3xl border-2 border-[#396254]/15 dark:border-neutral-800 overflow-hidden shadow-sm bg-white dark:bg-neutral-900">
                    <div className="bg-[#396254]/10 dark:bg-neutral-800/80 px-5 py-4 flex items-center justify-between gap-2 border-b border-[#396254]/10 dark:border-neutral-800">
                      <span className="text-sm font-bold text-[#396254] dark:text-[#dcf58d] flex items-center gap-2">
                        <span>Midtrans Snap Payment</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#dcf58d] text-[#396254] font-black">
                          Auto-Verified
                        </span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[10px] font-extrabold text-blue-800 tracking-tight shadow-xs">
                          BCA
                        </span>
                        <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-sky-600 shadow-xs">
                          gopay
                        </span>
                        <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-red-600 shadow-xs">
                          QRIS
                        </span>
                        <span
                          aria-label="Mastercard"
                          className="inline-flex items-center justify-center h-6 px-2.5 rounded-lg bg-neutral-900 shadow-xs"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 -ml-1 opacity-90" />
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#fafaf8] dark:bg-neutral-900/60 px-5 py-5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 text-center leading-relaxed">
                      Klik tombol <strong>Bayar Sekarang</strong> untuk memproses pesanan. Pop-up resmi Midtrans akan muncul dengan pilihan QRIS, Virtual Account BCA/Mandiri/BRI/BNI, GoPay, atau Kartu Kredit.
                    </div>
                  </div>
                </section>

                {/* Pay Now Submit Button */}
                <div className="mt-8 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isPayDisabled}
                    className={`w-full h-15 rounded-2xl text-base font-black transition-all flex items-center justify-center gap-2 shadow-md ${
                      isPayDisabled
                        ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-neutral-300 dark:border-neutral-700 shadow-none opacity-80"
                        : "bg-[#396254] hover:bg-[#2e5044] text-[#dcf58d] hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                    }`}
                  >
                    {isProcessingPayment ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Memproses Pesanan &amp; Midtrans...</span>
                      </>
                    ) : isLoadingShipping ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
                        <span>Menghitung Ongkos Kirim...</span>
                      </>
                    ) : !selectedRate ? (
                      <>
                        <Truck className="h-5 w-5 text-neutral-400" />
                        <span>Pilih Opsi Kurir Terlebih Dahulu</span>
                      </>
                    ) : (
                      <span>
                        Bayar Sekarang &bull;{" "}
                        {formatCheckoutPrice(grandTotal, currency)}
                      </span>
                    )}
                  </button>

                  {!isShippingReady && !isProcessingPayment && (
                    <p className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 text-center font-bold">
                      Lengkapi alamat tujuan &amp; pilih opsi kurir untuk mengaktifkan pembayaran.
                    </p>
                  )}
                </div>

                {/* Checkout Bottom Copyright */}
                <div className="mt-12 pt-5 border-t border-[#396254]/10 dark:border-neutral-800 text-xs text-neutral-500 flex items-center justify-between">
                  <p>All rights reserved it&apos;smatapanda &copy; 2026</p>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    256-Bit SSL Encription Protected
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900/60 flex justify-center lg:justify-start lg:border-l border-[#396254]/10 dark:border-neutral-800">
          <div className="w-full max-w-[580px] px-6 sm:px-10 lg:px-14 py-8 sm:py-11">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingBag className="h-5 w-5 text-[#396254]" />
              <h3 className="text-lg sm:text-xl font-black text-[#396254] dark:text-white">
                Ringkasan Pesanan
              </h3>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              {checkoutItems.map((item) => {
                const isGift = item.priceNumber === 0 || item.key.startsWith("free_gift__");
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between gap-4 p-3 rounded-2xl border transition-all hover:shadow-xs ${
                      isGift
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700"
                        : "bg-[#fafaf8] dark:bg-neutral-800/40 border-[#396254]/10 dark:border-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`relative h-18 w-18 sm:h-20 sm:w-20 rounded-2xl border-2 shrink-0 ${
                        isGift ? "border-emerald-300 bg-white" : "border-[#396254]/15 bg-white dark:bg-neutral-800"
                      }`}>
                        <div className="relative h-full w-full overflow-hidden rounded-2xl">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <span className={`absolute -top-2 -right-2 h-6 min-w-[24px] px-1.5 rounded-full text-xs font-black flex items-center justify-center leading-none shadow-sm ${
                          isGift ? "bg-emerald-600 text-white" : "bg-[#396254] text-[#dcf58d]"
                        }`}>
                          {item.quantity}
                        </span>
                      </div>

                      <div className="min-w-0">
                        {isGift && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[9px] uppercase tracking-wider mb-1">
                            <Gift className="h-2.5 w-2.5" /> Hadiah Gratis
                          </span>
                        )}
                        <p className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            isGift ? "bg-emerald-100 text-emerald-800" : "bg-[#d5c6ff]/30 text-[#396254] dark:text-[#d5c6ff]"
                          }`}>
                            {isGift ? "Bonus Spesial" : `${item.size} / ${item.color}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <p className={`text-sm sm:text-base font-black shrink-0 ${
                      isGift ? "text-emerald-700 dark:text-emerald-400" : "text-[#396254] dark:text-[#dcf58d]"
                    }`}>
                      {isGift ? "GRATIS" : formatCheckoutPrice(item.priceNumber * item.quantity, currency)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Discount Code Input / Applied Badge */}
            {appliedCoupon ? (
              <div className="mt-6 bg-[#dcf58d]/30 dark:bg-[#dcf58d]/10 border-2 border-[#396254]/20 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Ticket className="h-5 w-5 text-[#396254] dark:text-[#dcf58d] shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-black text-[#396254] dark:text-white tracking-wider uppercase">
                        {appliedCoupon.code}
                      </span>
                      {couponDiscount > 0 ? (
                        <span className="text-xs bg-[#dcf58d] text-[#396254] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          Hemat {formatCheckoutPrice(couponDiscount, currency)}
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          Min. belanja {formatCheckoutPrice(appliedCoupon.minSpend, currency)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 truncate">{appliedCoupon.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeCoupon();
                    setCouponError(null);
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold underline transition-colors px-1 py-0.5"
                >
                  Hapus
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCheckoutCoupon();
                      }
                    }}
                    placeholder="Kode kupon (misal: MATAPANDA10)"
                    className="flex-1 h-12 px-4 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#396254] focus:ring-2 focus:ring-[#d5c6ff]/50 uppercase font-mono tracking-wider shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCheckoutCoupon}
                    disabled={isApplyingCoupon || !discountCode.trim()}
                    className="h-12 px-5 rounded-2xl bg-[#396254] text-[#dcf58d] hover:bg-[#2e5044] disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 text-sm font-black transition-all uppercase tracking-wider shadow-sm hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                  >
                    {isApplyingCoupon ? "..." : "Pakai"}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-bold">{couponError}</p>
                )}
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="mt-6 p-5 rounded-3xl bg-[#fafaf8] dark:bg-neutral-800/40 border border-[#396254]/10 dark:border-neutral-800 space-y-3.5 text-sm shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">Subtotal</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {formatCheckoutPrice(checkoutSubtotal, currency)}
                </span>
              </div>

              {/* Paket Diskon Line */}
              {bundleDiscount > 0 && (
                <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-bold bg-purple-50/80 dark:bg-purple-950/40 px-3 py-2 rounded-2xl border border-purple-200 dark:border-purple-800/80">
                  <span className="flex items-center gap-1.5 text-xs">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Paket Diskon ({appliedBundle?.name || "Min. Belanja"})</span>
                  </span>
                  <span className="text-xs">-{formatCheckoutPrice(bundleDiscount, currency)}</span>
                </div>
              )}

              {/* Paket Hadiah Line */}
              {giftItem && (
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50/80 dark:bg-emerald-950/40 px-3 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800/80">
                  <span className="flex items-center gap-1.5 text-xs truncate">
                    <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Paket Hadiah ({giftItem.name})</span>
                  </span>
                  <span className="text-xs uppercase font-black text-emerald-600 dark:text-emerald-400 shrink-0">GRATIS</span>
                </div>
              )}

              {/* Coupon Discount Line */}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="h-4 w-4" />
                    <span>Diskon Kupon ({appliedCoupon.code})</span>
                  </span>
                  <span>-{formatCheckoutPrice(couponDiscount, currency)}</span>
                </div>
              )}

              {/* Dynamic Shipping Line */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400 font-medium flex items-center gap-1.5">
                  <span>Ongkos Kirim</span>
                  {selectedRate && (
                    <span className="text-xs font-bold text-[#396254] dark:text-[#d5c6ff]">
                      ({selectedRate.name})
                    </span>
                  )}
                </span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {isLoadingShipping ? (
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin text-[#396254]" />
                      Menghitung...
                    </span>
                  ) : selectedRate ? (
                    formatCheckoutPrice(selectedRate.cost, currency)
                  ) : (
                    <span className="text-xs text-neutral-400 italic">
                      Belum dipilih
                    </span>
                  )}
                </span>
              </div>

              {/* Grand Total */}
              <div className="pt-3.5 border-t border-neutral-200 dark:border-neutral-700 flex items-baseline justify-between">
                <div>
                  <span className="text-lg font-black text-[#396254] dark:text-white block">
                    Total Akhir
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {selectedRate
                      ? `Termasuk ongkir (${selectedRate.name})`
                      : "Belum termasuk ongkir"}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-neutral-400">
                    {currency}
                  </span>
                  <span className="text-2xl font-black text-[#396254] dark:text-[#dcf58d]">
                    {formatCheckoutPrice(grandTotal, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Assurance Pill */}
            <div className="mt-6 rounded-3xl border-2 border-[#396254]/15 bg-[#396254]/5 dark:bg-neutral-800/50 p-4.5 space-y-2 text-xs text-neutral-700 dark:text-neutral-300 shadow-sm">
              <div className="flex items-center gap-2 font-black text-[#396254] dark:text-[#dcf58d]">
                <Truck className="h-4 w-4" />
                <span>Garansi Pengiriman it&apos;smatapanda</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                {isDomestic
                  ? "Seluruh pesanan dalam negeri dikirim langsung dari Jakarta menggunakan JNE Express terpercaya berasuransi penuh."
                  : "Pesanan internasional dikirim dengan prioritas tinggi via DHL Express Worldwide terlacak langsung."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
