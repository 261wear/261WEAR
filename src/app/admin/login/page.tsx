import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-24">
      <Logo />
      <p className="mt-2 mb-6 text-sm text-muted">Back-office</p>
      <LoginForm />
    </div>
  );
}
