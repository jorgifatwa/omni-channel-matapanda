"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  ExternalLink,
  Printer,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminStore } from "@/context/AdminStoreContext";
import { type AdminOrder } from "@/lib/admin-data";
import { formatIDR } from "@/lib/products";
import { ShippingLabelModal } from "@/components/admin/ShippingLabelModal";
import { PackingSlipModal } from "@/components/admin/PackingSlipModal";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const { orders, updateOrder } = useAdminStore();

  const order = orders.find((o) => o.id === params.id) ?? orders[0];

  const [orderStatus, setOrderStatus] = React.useState(order.orderStatus);
  const [paymentStatus, setPaymentStatus] = React.useState(order.paymentStatus);
  const [shipmentStatus, setShipmentStatus] = React.useState(
    order.shipmentStatus
  );
  const [trackingNumber, setTrackingNumber] = React.useState(
    order.trackingNumber === "-" ? "" : order.trackingNumber
  );
  const [saveMessage, setSaveMessage] = React.useState(false);
  const [isShippingLabelOpen, setIsShippingLabelOpen] = React.useState(false);
  const [isPackingSlipOpen, setIsPackingSlipOpen] = React.useState(false);

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();

    const updated = {
      ...order,
      orderStatus,
      paymentStatus,
      shipmentStatus,
      trackingNumber: trackingNumber.trim() || "-",
      trackingHistory: [
        ...order.trackingHistory,
        {
          timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
          status: shipmentStatus,
          description: `Status updated to ${shipmentStatus} (${order.courier}) by Admin`,
          location: order.shippingAddress.city,
        },
      ],
    };

    if (paymentStatus === "SETTLEMENT" && order.paymentStatus !== "SETTLEMENT") {
      fetch("/api/payment/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderNumber,
          email: order.customerEmail,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          shippingAddress: order.shippingAddress,
          items: order.items,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          discountAmount: order.discountAmount,
          totalAmount: order.totalAmount,
          courier: order.courier,
          courierService: order.courierService,
          trackingNumber: trackingNumber.trim() || order.trackingNumber,
          paymentMethod: order.paymentMethod,
          paymentStatus: "SETTLEMENT",
        }),
      }).catch((err) => console.warn("Admin trigger email error:", err));
    }

    updateOrder(updated);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back Button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-9 w-9">
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold font-mono">
                {order.orderNumber}
              </h1>
              <Badge variant="default">{order.orderStatus}</Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Dibuat pada {order.createdAt} via {order.paymentMethod}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveMessage && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mr-2">
              <CheckCircle2 className="h-4 w-4" />
              Status berhasil diperbarui!
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPackingSlipOpen(true)}
            className="gap-1.5 text-xs h-9 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 shadow-xs"
          >
            <FileText className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
            <span>Cetak Packing Slip</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsShippingLabelOpen(true)}
            className="gap-1.5 text-xs h-9 bg-[#396254] hover:bg-[#2d4e44] text-white shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Label Resi</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Order Items, Summary & Tracking History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Purchased Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>List Item yang Dibeli ({order.items.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Varian</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded bg-neutral-100 overflow-hidden shrink-0 border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-xs sm:text-sm">
                              {item.productName}
                            </p>
                            <p className="font-mono text-[11px] text-neutral-500">
                              {item.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.size} / {item.color}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatIDR(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        {formatIDR(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Payment Summary */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 mt-4 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Subtotal</span>
                  <span>{formatIDR(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>
                    Ongkos Kirim ({order.courier} {order.courierService})
                  </span>
                  <span>{formatIDR(order.shippingCost)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Diskon</span>
                    <span>-{formatIDR(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t pt-2 text-neutral-900 dark:text-neutral-100">
                  <span>Total Pembayaran</span>
                  <span>{formatIDR(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking History Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Tracking Pengiriman ({order.courier})</span>
                </CardTitle>
                <CardDescription>
                  Nomor Resi:{" "}
                  <code className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                    {order.trackingNumber}
                  </code>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShippingLabelOpen(true)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Printer className="h-3 w-3 text-[#396254]" />
                  <span>Cetak Resi</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 text-xs gap-1.5"
                >
                  <Link
                    href={`/api/shipping/tracking?courier=${order.courier}&waybill=${order.trackingNumber}`}
                    target="_blank"
                  >
                    <span>API Cek Resi</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {order.trackingHistory.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">
                  Belum ada riwayat pergerakan resi pengiriman.
                </p>
              ) : (
                <div className="relative pl-6 space-y-4 border-l-2 border-neutral-200 dark:border-neutral-800 ml-2">
                  {order.trackingHistory.map((step, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full bg-neutral-900 dark:bg-white border-2 border-white dark:border-neutral-950" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">
                            {step.status}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {step.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5">
                          {step.description}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {step.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer Info, Shipping Address & Manual Status Update */}
        <div className="lg:col-span-4 space-y-6">
          {/* Manual Status & Resi Update Card */}
          <Card className="border-neutral-300 dark:border-neutral-700">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Update Status Manual</span>
              </CardTitle>
              <CardDescription>
                Update status transaksi atau input nomor resi dari JNE / DHL.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="order-status">Status Pesanan</Label>
                  <select
                    id="order-status"
                    value={orderStatus}
                    onChange={(e) =>
                      setOrderStatus(e.target.value as AdminOrder["orderStatus"])
                    }
                    className="flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-xs"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pay-status">Status Pembayaran</Label>
                  <select
                    id="pay-status"
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(
                        e.target.value as AdminOrder["paymentStatus"]
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-xs"
                  >
                    <option value="SETTLEMENT">SETTLEMENT (Lunas)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CANCEL">CANCEL</option>
                    <option value="EXPIRE">EXPIRE</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ship-status">Status Pengiriman</Label>
                  <select
                    id="ship-status"
                    value={shipmentStatus}
                    onChange={(e) =>
                      setShipmentStatus(
                        e.target.value as AdminOrder["shipmentStatus"]
                      )
                    }
                    className="flex h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3 text-xs"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PICKED_UP">PICKED_UP</option>
                    <option value="IN_TRANSIT">IN_TRANSIT</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tracking-num">
                    Nomor Resi ({order.courier})
                  </Label>
                  <Input
                    id="tracking-num"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Contoh: JNE009823718291"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <Button type="submit" className="w-full h-9 text-xs">
                  Simpan Perubahan
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Customer & Address Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Info Customer &amp; Alamat</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <p className="font-semibold text-sm">{order.customerName}</p>
                <p className="text-neutral-500">{order.customerEmail}</p>
                <p className="text-neutral-500">{order.customerPhone}</p>
              </div>

              <div className="border-t pt-3 space-y-1 text-neutral-700 dark:text-neutral-300">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Alamat Pengiriman:
                </p>
                <p>{order.shippingAddress.street}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {order.shippingAddress.country}
                </p>
              </div>

              <div className="border-t pt-3 space-y-1">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Midtrans Transaction
                </p>
                <p className="font-mono text-[11px] text-neutral-500">
                  ID: {order.midtransTransactionId}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Modals */}
      <ShippingLabelModal
        order={order}
        isOpen={isShippingLabelOpen}
        onClose={() => setIsShippingLabelOpen(false)}
      />
      <PackingSlipModal
        order={order}
        isOpen={isPackingSlipOpen}
        onClose={() => setIsPackingSlipOpen(false)}
      />
    </div>
  );
}
