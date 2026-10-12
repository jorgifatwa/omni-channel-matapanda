"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Truck } from "lucide-react";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminStore } from "@/context/AdminStoreContext";
import { type AdminOrder } from "@/lib/admin-data";
import { formatIDR } from "@/lib/products";

function getPaymentStatusBadge(status: string) {
  switch (status) {
    case "SETTLEMENT":
      return <Badge variant="success">Settlement</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>;
    case "CANCEL":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "EXPIRE":
      return <Badge variant="secondary">Expired</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getShipmentStatusBadge(status: string) {
  switch (status) {
    case "DELIVERED":
      return <Badge variant="success">Delivered</Badge>;
    case "IN_TRANSIT":
      return <Badge variant="info">In Transit</Badge>;
    case "PICKED_UP":
      return <Badge variant="default">Picked Up</Badge>;
    case "PENDING":
    default:
      return <Badge variant="warning">Pending</Badge>;
  }
}

export default function AdminOrdersPage() {
  const { orders } = useAdminStore();

  const columns: ColumnDef<AdminOrder>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order ID",
      cell: ({ row }) => (
        <Link
          href={`/admin/orders/${row.original.id}`}
          className="font-mono text-xs font-bold text-black dark:text-white hover:underline"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-xs sm:text-sm">
            {row.original.customerName}
          </p>
          <p className="text-[11px] text-neutral-500">
            {row.original.customerEmail}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-bold text-xs">
          {formatIDR(row.original.totalAmount)}
        </span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Metode Pembayaran",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.paymentMethod}</span>
      ),
    },
    {
      id: "paymentStatus",
      accessorFn: (row) => row.paymentStatus,
      header: "Status Pembayaran",
      cell: ({ row }) => getPaymentStatusBadge(row.original.paymentStatus),
    },
    {
      id: "shipmentStatus",
      accessorFn: (row) => row.shipmentStatus,
      header: "Status Pengiriman",
      cell: ({ row }) => getShipmentStatusBadge(row.original.shipmentStatus),
    },
    {
      accessorKey: "courier",
      header: "Kurir",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Truck className="h-3.5 w-3.5 text-neutral-500" />
          <span>
            {row.original.courier} ({row.original.courierService})
          </span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Tanggal",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {row.original.createdAt}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-white dark:bg-neutral-950">
            <DropdownMenuItem asChild className="text-xs cursor-pointer">
              <Link
                href={`/admin/orders/${row.original.id}`}
                className="flex items-center gap-2"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Detail Order</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Order &amp; Sales Management
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Daftar seluruh transaksi masuk, status pembayaran Midtrans, dan resi
          pengiriman JNE / DHL.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        searchPlaceholder="Cari Order ID, nama customer, email..."
        filterOptions={[
          {
            columnId: "paymentStatus",
            label: "Status Bayar",
            options: [
              { label: "Settlement (Lunas)", value: "SETTLEMENT" },
              { label: "Pending", value: "PENDING" },
              { label: "Cancelled", value: "CANCEL" },
            ],
          },
          {
            columnId: "shipmentStatus",
            label: "Status Kirim",
            options: [
              { label: "Pending", value: "PENDING" },
              { label: "In Transit", value: "IN_TRANSIT" },
              { label: "Delivered", value: "DELIVERED" },
            ],
          },
        ]}
      />
    </div>
  );
}
