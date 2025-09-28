"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { getUserPermissions } from "@/lib/permissions";

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { data: session } = useSession();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!session?.user?.id) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        const permissions = await getUserPermissions(session.user.id);
        setHasPermission(permissions.includes(permission));
      } catch (error) {
        console.error('Erreur vérification permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [session?.user?.id, permission]);

  if (loading) {
    return <div className="animate-pulse bg-muted h-4 w-20 rounded"></div>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
