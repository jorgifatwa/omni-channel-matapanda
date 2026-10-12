"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError("Email atau password salah. Silakan coba lagi.");
        setIsLoading(false);
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setAuthError("Terjadi kesalahan saat memproses login.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 py-12">
      <div className="mb-8 text-center">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 mb-3 shadow-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-wider uppercase text-neutral-900 dark:text-white">
          it&apos;smatapanda ADMIN
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Streetwear &amp; Retail Management Console
        </p>
      </div>

      <Card className="w-full max-w-md border-neutral-200 dark:border-neutral-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold">Login Admin</CardTitle>
          <CardDescription>
            Masukkan email dan password akun administrator Anda untuk masuk ke
            dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {authError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
              {authError}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jorgifatwaambia@gmail.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                <Lock className="mr-2 h-4 w-4" />
                {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
