"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    if (status === "authenticated" && session?.user) {
      // Vérifier que l'utilisateur est admin
      if (!('role' in session.user) || session.user.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
    }
  }, [session, status, router]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Le layout principal du dashboard s'occupe déjà de la navbar
  return <>{children}</>;
}