"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FoldersView } from "@/components/dashboard/folders-view";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    if (status === "authenticated" && session?.user) {
      if (session.user.status !== "approved" || session.user.role !== "member") {
        router.replace("/waiting");
      }
    }
  }, [session, status, router]);

  if (status === "loading" || !session?.user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 max-w-[1920px] mx-auto">
      <FoldersView />
    </div>
  );
}