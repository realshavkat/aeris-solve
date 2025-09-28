"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronsLeft,
  MenuIcon,
  FolderIcon,
  UserCircle,
  LogOut,
  Settings,
  Users,
  Shield,
  Bell,
  ArrowLeft,
  Home,
  Target, // Nouveau import nécessaire
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { NotificationsPopover } from "@/components/notifications/notifications-popover";
import { Logo } from "@/components/ui/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Vérifier si on est dans la section admin
  const isAdminSection = pathname.startsWith("/dashboard/admin");

  const routes = [
    {
      icon: FolderIcon,
      href: "/dashboard",
      label: "Dossiers",
      isActive: pathname === "/dashboard",
    },
    {
      icon: Target, // Nouveau import nécessaire
      href: "/dashboard/missions",
      label: "Missions",
      isActive: pathname === "/dashboard/missions",
    },
    {
      icon: UserCircle,
      href: "/dashboard/profile",
      label: "Profil",
      isActive: pathname === "/dashboard/profile",
    },
  ];

  // Routes administrateur
  const adminRoutes = [
    {
      icon: Home,
      href: "/dashboard/admin",
      label: "Accueil",
      isActive: pathname === "/dashboard/admin",
    },
    {
      icon: FolderIcon,
      href: "/dashboard/admin/folders",
      label: "Dossiers",
      isActive: pathname.startsWith("/dashboard/admin/folders"),
    },
    {
      icon: Users,
      href: "/dashboard/admin/users",
      label: "Utilisateurs",
      isActive: pathname.startsWith("/dashboard/admin/users"),
    },
    {
      icon: Target, // Nouveau
      href: "/dashboard/admin/missions",
      label: "Missions",
      isActive: pathname.startsWith("/dashboard/admin/missions"),
    },
    {
      icon: Shield,
      href: "/dashboard/admin/roles",
      label: "Rôles",
      isActive: pathname.startsWith("/dashboard/admin/roles"),
    },
    {
      icon: Bell,
      href: "/dashboard/admin/notifications",
      label: "Notifications",
      isActive: pathname.startsWith("/dashboard/admin/notifications"),
    },
  ];

  const isAdmin = session?.user && 'role' in session.user && session.user.role === "admin";
  const currentRoutes = isAdminSection ? adminRoutes : routes;

  return (
    <TooltipProvider>
      <div className="flex h-screen">
        <aside
          className={cn(
            "flex flex-col border-r bg-background p-4 pt-8 relative transition-all duration-300",
            isCollapsed ? "w-[75px]" : "w-60"
          )}
        >
          <div className={cn(
            "flex items-center mb-6 px-2",
            isCollapsed ? "justify-center flex-col gap-2" : "justify-between"
          )}>
            <Logo />
            
            {/* Conteneur des éléments de droite avec gestion responsive */}
            <div className={cn(
              "flex items-center gap-2",
              isCollapsed && "flex-col"
            )}>
              {/* Badge admin si on est dans la section admin */}
              {isAdminSection && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full text-xs font-medium",
                      isCollapsed && "p-1"
                    )}>
                      <Settings className="w-3 h-3" />
                      {!isCollapsed && <span>ADMIN</span>}
                    </div>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      Mode Administrateur
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              
              {/* Avatar utilisateur */}
              {session?.user && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={session.user.image || ""} alt="Avatar" />
                      <AvatarFallback>
                        {session.user.anonymousNickname?.[0]?.toUpperCase() || session.user.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      {session.user.anonymousNickname || session.user.name}
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              
              {/* Notifications */}
              <div className="flex-shrink-0">
                {isCollapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div>
                        <NotificationsPopover />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Notifications
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <NotificationsPopover />
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="icon"
            className={cn(
              "absolute -right-5 bottom-10 h-10 w-10 rounded-full p-0 hover:bg-secondary cursor-pointer",
              "border border-border bg-background",
              "transition-all duration-300"
            )}
          >
            {isCollapsed ? <MenuIcon size={12} /> : <ChevronsLeft size={12} />}
          </Button>

          <div className="flex flex-col gap-2">
            {currentRoutes.map((route) => (
              <Tooltip key={route.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link href={route.href}>
                    <Button
                      variant={route.isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isCollapsed && "justify-center p-2 w-10",
                        route.isActive && "bg-secondary",
                        "cursor-pointer hover:bg-secondary/80 transition-colors"
                      )}
                      size={isCollapsed ? "icon" : "default"}
                    >
                      <route.icon size={22} />
                      {!isCollapsed && <span>{route.label}</span>}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="flex items-center gap-4">
                    {route.label}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {/* Navigation entre mode admin et normal */}
            {isAdmin && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3 cursor-pointer",
                      isAdminSection 
                        ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950" 
                        : "text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950",
                      isCollapsed && "justify-center p-2"
                    )}
                    onClick={() => router.push(isAdminSection ? '/dashboard' : '/dashboard/admin')}
                  >
                    {isAdminSection ? <ArrowLeft size={22} /> : <Settings size={22} />}
                    {!isCollapsed && (
                      <span>{isAdminSection ? 'Dashboard' : 'Mode Administrateur'}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    {isAdminSection ? 'Dashboard' : 'Mode Administrateur'}
                  </TooltipContent>
                )}
              </Tooltip>
            )}
            
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3",
                    isCollapsed && "justify-center p-2"
                  )}
                  onClick={() => signOut()}
                >
                  <LogOut size={22} />
                  {!isCollapsed && <span>Déconnexion</span>}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">Déconnexion</TooltipContent>
              )}
            </Tooltip>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
