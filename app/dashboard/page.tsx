"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FoldersView from "@/components/dashboard/folders-view";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return; // Attendre que la session soit chargée

    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    if (status === "authenticated" && session?.user) {
      if (session.user.status !== "approved") {
        router.replace("/waiting");
        return;
      }
      setIsReady(true);
    }
  }, [session, status, router]);

  // CORRECTION: Loading plus simple
  if (status === "loading" || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 max-w-[1920px] mx-auto">
      <FoldersView />
    </div>
  );
}