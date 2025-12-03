"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => router.refresh());
  };

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isPending}>
      {isPending ? "Выходим..." : "Выйти"}
    </Button>
  );
}
