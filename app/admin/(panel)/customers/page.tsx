"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, ShoppingBag, Mail, Phone, MapPin } from "lucide-react";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminStore } from "@/context/AdminStoreContext";
import { type AdminCustomer } from "@/lib/admin-data";
import { formatIDR } from "@/lib/products";

export default function AdminCustomersPage() {
  const { customers, orders } = useAdminStore();
  const [selectedCustomer, setSelectedCustomer] =
    React.useState<AdminCustomer | null>(null);

  const customerOrders = selectedCustomer
    ? orders.filter(
        (o) =>
          o.customerId === selectedCustomer.id ||
          o.customerEmail.toLowerCase() === selectedCustomer.email.toLowerCase()
      )
    : [];

  const columns: ColumnDef<AdminCustomer>[] = [
    {
      accessorKey: "name",
      header: "Nama Customer",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-xs sm:text-sm">
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "No HP",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.phone}</span>
      ),
    },
    {
      accessorKey: "city",
      header: "Kota / Negara",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.city}, {row.original.country}
        </span>
      ),
    },
    {
      accessorKey: "totalOrders",
      header: "Total Order",
      cell: ({ row }) => (
        <span className="font-semibold text-xs">
          {row.original.totalOrders} pesanan
        </span>
      ),
    },
    {
      accessorKey: "totalSpent",
      header: "Total Belanja",
      cell: ({ row }) => (
        <span className="font-bold text-xs">
          {formatIDR(row.original.totalSpent)}
        </span>
      ),
    },
    {
      accessorKey: "registeredAt",
      header: "Terdaftar Sejak",
      cell: ({ row }) => (
        <span className="text-xs text-neutral-500">
          {row.original.registeredAt}
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
            <DropdownMenuItem
              onClick={() => setSelectedCustomer(row.original)}
              className="text-xs cursor-pointer flex items-center gap-2"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Riwayat Order</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customer Management</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Daftar seluruh pelanggan terdaftar, riwayat belanja, dan kontak.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        searchPlaceholder="Cari nama, email, no HP, kota..."
      />

      {/* Customer Detail & Order History Modal */}
      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Detail Customer &amp; Riwayat Belanja</span>
            </DialogTitle>
            <DialogDescription>
              Informasi kontak dan riwayat seluruh pesanan dari{" "}
              <strong>{selectedCustomer?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6 mt-2">
              {/* Profile Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-neutral-500 font-medium">Email</p>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedCustomer.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-neutral-500 font-medium">Telepon</p>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-neutral-500 font-medium">Lokasi</p>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedCustomer.city}, {selectedCustomer.country}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order History Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Riwayat Transaksi ({customerOrders.length} Pesanan)
                </h3>
                {customerOrders.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic p-4 text-center border rounded-md">
                    Belum ada riwayat pesanan yang terkait dengan email ini.
                  </p>
                ) : (
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Kurir</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-xs font-bold">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell className="text-xs">
                              {order.createdAt}
                            </TableCell>
                            <TableCell className="text-xs">
                              {order.courier} ({order.courierService})
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="text-[10px]">
                                {order.orderStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs font-bold">
                              {formatIDR(order.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7 text-[11px]"
                              >
                                <Link
                                  href={`/admin/orders/${order.id}`}
                                  onClick={() => setSelectedCustomer(null)}
                                >
                                  Buka Order
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
