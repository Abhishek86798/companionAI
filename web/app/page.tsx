"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace("/auth");
      return;
    }
    const done = localStorage.getItem("arjun_onboarding_done") === "true";
    router.replace(done ? "/chat" : "/onboarding");
  }, [session, isLoading, router]);

  return null;
}
