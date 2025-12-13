"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      
      // Dispatch auth change event
      window.dispatchEvent(new Event("auth-changed"));
      
      // Redirect to home
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} disabled={isPending}>
      {isPending ? "Выходим..." : "Выйти"}
    </Button>
  );
}
