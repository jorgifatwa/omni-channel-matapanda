import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { QuickAddProvider } from "@/context/QuickAddContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/components/providers/AuthProvider";

const grandstander = localFont({
  src: "./fonts/Grandstander-Medium.ttf",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "it'smatapanda",
  description: "it'smatapanda — Streetwear, Print Shop & Cultural Space",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={grandstander.variable}>
      <body
        className="font-sans bg-white text-black antialiased selection:bg-neutral-200 selection:text-black"
      >
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <QuickAddProvider>{children}</QuickAddProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
