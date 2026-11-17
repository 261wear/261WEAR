import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-svh items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo className="text-3xl text-ink [&>span]:text-ink" />
        <p className="mt-2 mb-6 text-sm font-semibold text-ink/75">Back-office</p>
        <LoginForm />
      </div>
    </div>
  );
}
