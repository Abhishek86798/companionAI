"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/auth");
    }
  }, [session, isLoading, router]);

  if (isLoading || !session) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0F0F14" }}
    >
      <p className="text-sm" style={{ color: "#6B7280" }}>
        Settings — coming soon
      </p>
    </div>
  );
}
