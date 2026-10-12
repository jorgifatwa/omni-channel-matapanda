"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Mail,
  Sun,
  Moon,
  LogOut,
  Menu,
  ExternalLink,
  ChevronRight,
  Store,
  Plug,
  BadgePercent,
  Ticket,
  Layers,
  SlidersHorizontal,
  Megaphone,
  Camera,
  HelpCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";

const ADMIN_NAV = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: Package,
      },
      {
        label: "Product Series",
        href: "/admin/series",
        icon: Layers,
      },
      {
        label: "Categories",
        href: "/admin/categories",
        icon: FolderTree,
      },
    ],
  },
  {
    title: "Transactions & CRM",
    items: [
      {
        label: "Orders & Sales",
        href: "/admin/orders",
        icon: ShoppingCart,
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
      },
      {
        label: "Pesan Masuk",
        href: "/admin/inquiries",
        icon: Mail,
      },
      {
        label: "Newsletter Subscribers",
        href: "/admin/subscribers",
        icon: Send,
      },
    ],
  },
  {
    title: "Promosi & Marketing",
    items: [
      {
        label: "Diskon Produk",
        href: "/admin/discounts",
        icon: BadgePercent,
      },
      {
        label: "Kupon & Voucher",
        href: "/admin/coupons",
        icon: Ticket,
      },
    ],
  },
  {
    title: "Tampilan & Konten",
    items: [
      {
        label: "Banner Beranda",
        href: "/admin/banners",
        icon: SlidersHorizontal,
      },
      {
        label: "Announcement Bar",
        href: "/admin/announcements",
        icon: Megaphone,
      },
      {
        label: "Community (ON YOU)",
        href: "/admin/community",
        icon: Camera,
      },
      {
        label: "FAQs & Panduan",
        href: "/admin/faqs",
        icon: HelpCircle,
      },
    ],
  },
  {
    title: "Integrasi",
    items: [
      {
        label: "Marketplace",
        href: "/admin/integrations",
        icon: Plug,
      },
    ],
  },
];

export default function AdminLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [darkMode, setDarkMode] = React.useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const saved = window.localStorage.getItem("matapanda_admin_theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("matapanda_admin_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      window.localStorage.setItem("matapanda_admin_theme", "light");
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderSidebarNav = (onNavigate?: () => void) => (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Scrollable Navigation Items */}
      <nav
        className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-6"
        aria-label="Admin Navigation"
      >
        {ADMIN_NAV.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActiveRoute(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                          : "text-neutral-600 hover:bg-neutral-900 hover:text-white dark:text-neutral-400 dark:hover:bg-neutral-100 dark:hover:text-neutral-900"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {active && <ChevronRight className="h-3.5 w-3.5" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Pinned Bottom Link: Storefront */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-950">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-900 hover:text-white dark:text-neutral-400 dark:hover:bg-neutral-100 dark:hover:text-neutral-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span>Lihat Storefront</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex bg-neutral-50/60 dark:bg-neutral-950 text-neutral-950 dark:text-neutral-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 z-30 overflow-hidden">
        <div className="h-16 shrink-0 flex items-center gap-2.5 px-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="h-8 w-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-black text-xs">
            IMP
          </div>
          <div>
            <p className="text-sm font-black tracking-wider uppercase leading-none">
              it&apos;smatapanda
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Admin Panel
            </p>
          </div>
        </div>

        {renderSidebarNav()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Trigger */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-64 p-0 bg-white dark:bg-neutral-950 flex flex-col overflow-hidden"
                >
                  <SheetHeader className="h-16 shrink-0 px-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-row items-center gap-2.5 text-left space-y-0">
                    <div className="h-8 w-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-black text-xs">
                      IMP
                    </div>
                    <SheetTitle className="text-sm font-black tracking-wider uppercase">
                      it&apos;smatapanda ADMIN
                    </SheetTitle>
                  </SheetHeader>
                  {renderSidebarNav(() => setMobileMenuOpen(false))}
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Admin</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                {pathname.replace("/admin/", "").replace("/", " / ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Real-time Admin Notification Bell */}
            <AdminNotificationBell />

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="h-9 w-9 border-neutral-200 dark:border-neutral-800"
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-neutral-700" />
              )}
            </Button>

            {/* Admin Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 gap-2 border-neutral-200 dark:border-neutral-800 text-xs font-medium"
                >
                  <span className="h-5 w-5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-bold">
                    IMP
                  </span>
                  <span className="hidden sm:inline">it&apos;smatapanda Admin</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              >
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-semibold">{session?.user?.name || "it'smatapanda Admin"}</p>
                  <p className="text-[11px] text-neutral-500">
                    {session?.user?.email || "jorgifatwaambia@gmail.com"}
                  </p>
                </div>
                <DropdownMenuItem asChild className="text-xs cursor-pointer">
                  <Link href="/">Ke Halaman Storefront</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/admin/login" })}
                  className="text-xs text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
