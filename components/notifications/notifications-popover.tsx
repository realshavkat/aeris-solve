"use client";

import {
  Bell,
  X,
  Eye,
  Clock,
  AlertCircle,
  Info,
  CheckCircle2,
  AlertTriangle,
  Search,
  Trash2,
  Filter,
  SortDesc,
  SortAsc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  importance: "low" | "medium" | "high" | "critical";
  read: boolean;
  createdAt: string;
  sender?: {
    name: string;
  };
}

const importanceConfig = {
  low: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    label: "Info",
  },
  medium: {
    icon: Bell,
    color: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
    label: "Normal",
  },
  high: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    label: "Important",
  },
  critical: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    label: "Critique",
  },
};

// CACHE GLOBAL AMÉLIORÉ avec gestion de la visibilité de la page
const notificationsCache = {
  data: [] as Notification[],
  timestamp: 0,
  isLoading: false,
  listeners: new Set<() => void>(),
  // AJOUT: État de visibilité de la page
  isPageVisible: true,
  lastVisibilityChange: Date.now(),
};

const CACHE_DURATION = 30 * 1000; // 30 secondes
const REFRESH_INTERVAL_ACTIVE = 2 * 60 * 1000; // 2 minutes quand la page est active
const REFRESH_INTERVAL_BACKGROUND = 10 * 60 * 1000; // 10 minutes quand la page est en arrière-plan
const MIN_TIME_BETWEEN_REQUESTS = 5 * 1000; // 5 secondes minimum entre les requêtes

// AJOUT: Fonction pour gérer la visibilité de la page
const handleVisibilityChange = () => {
  const wasVisible = notificationsCache.isPageVisible;
  notificationsCache.isPageVisible = !document.hidden;
  notificationsCache.lastVisibilityChange = Date.now();

  console.log(
    `🔔 Page visibility changed: ${
      notificationsCache.isPageVisible ? "visible" : "hidden"
    }`
  );

  // Si la page redevient visible après avoir été cachée, faire un refresh modéré
  if (!wasVisible && notificationsCache.isPageVisible) {
    console.log("📱 Page redevient visible, refresh modéré dans 2 secondes");
    setTimeout(() => {
      if (notificationsCache.isPageVisible) {
        notificationsCache.listeners.forEach((listener) => {
          // Simuler un refresh en appelant les listeners
          try {
            listener();
          } catch (error) {
            console.error("Erreur lors du refresh visibility:", error);
          }
        });
      }
    }, 2000);
  }
};

// AJOUT: Initialiser l'écoute de la visibilité de la page
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityChange);
  // Initialiser l'état
  notificationsCache.isPageVisible = !document.hidden;
}

// Fonction pour notifier tous les composants d'un changement
const notifyListeners = () => {
  notificationsCache.listeners.forEach((listener) => listener());
};

export function NotificationsPopover() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Références pour éviter les fuites mémoire
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  
  // NOUVELLE FONCTION pour forcer la synchronisation du cache
  const syncFromCache = useCallback(() => {
    if (notificationsCache.data.length > 0) {
      setNotifications(notificationsCache.data);
      setUnreadCount(notificationsCache.data.filter(n => !n.read).length);
      setAllNotifications(notificationsCache.data);
    }
  }, []);

  // FONCTION DE FETCH OPTIMISÉE avec gestion de la visibilité
  const fetchNotifications = useCallback(async (force = false) => {
    if (!isMountedRef.current) return;
    
    const now = Date.now();
    
    // AJOUT: Vérifier le temps minimum entre les requêtes
    if (!force && (now - lastFetchTimeRef.current) < MIN_TIME_BETWEEN_REQUESTS) {
      console.log('⏱️ Requête trop rapide, ignorée');
      return;
    }
    
    // AJOUT: Si la page n'est pas visible et pas forcée, limiter les requêtes
    if (!notificationsCache.isPageVisible && !force) {
      // Seulement si ça fait plus de 5 minutes qu'on a pas fetch
      if ((now - notificationsCache.timestamp) < (5 * 60 * 1000)) {
        console.log('📱 Page en arrière-plan, pas de fetch');
        return;
      }
    }
    
    // Utiliser le cache si disponible et récent (sauf si force = true)
    if (!force && notificationsCache.timestamp && (now - notificationsCache.timestamp < CACHE_DURATION)) {
      console.log('📋 Utilisation du cache notifications');
      syncFromCache();
      setInitialLoading(false);
      return;
    }
    
    // Éviter les requêtes simultanées
    if (notificationsCache.isLoading) {
      console.log('⏳ Requête notifications déjà en cours');
      return;
    }
    
    // Annuler la requête précédente si elle existe
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    
    fetchAbortControllerRef.current = new AbortController();
    notificationsCache.isLoading = true;
    lastFetchTimeRef.current = now;
    
    try {
      console.log('🔔 Fetch notifications depuis API (page visible:', notificationsCache.isPageVisible, ')');
      const response = await fetch("/api/notifications", {
        signal: fetchAbortControllerRef.current.signal,
        headers: { 
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) throw new Error('Erreur réseau');
      
      const data = await response.json();
      
      if (isMountedRef.current) {
        // Mettre à jour le cache global
        notificationsCache.data = data;
        notificationsCache.timestamp = now;
        
        // Mettre à jour tous les états locaux
        setNotifications(data);
        setAllNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
        setInitialLoading(false);
        
        // Notifier les autres instances du composant
        notifyListeners();
        
        console.log('✅ Notifications mises à jour:', data.length, 'non lues:', data.filter((n: Notification) => !n.read).length);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("❌ Erreur chargement notifications:", error);
      }
    } finally {
      notificationsCache.isLoading = false;
    }
  }, [syncFromCache]);

  // Enregistrer ce composant comme listener pour les changements de cache
  useEffect(() => {
    const listener = syncFromCache;
    notificationsCache.listeners.add(listener);
    
    return () => {
      notificationsCache.listeners.delete(listener);
    };
  }, [syncFromCache]);

  // EFFET PRINCIPAL - OPTIMISÉ avec gestion de la visibilité
  useEffect(() => {
    isMountedRef.current = true;
    
    // Chargement initial avec cache si disponible
    if (notificationsCache.timestamp === 0 || notificationsCache.data.length === 0) {
      fetchNotifications(true); // Force le premier chargement
    } else {
      // Utiliser le cache existant
      syncFromCache();
      setInitialLoading(false);
      
      // Mais vérifier s'il y a des nouvelles notifications seulement si la page est visible
      if (notificationsCache.isPageVisible) {
        setTimeout(() => {
          if (isMountedRef.current && notificationsCache.isPageVisible) {
            fetchNotifications(true);
          }
        }, 1000);
      }
    }
    
    // MODIFIÉ: Interval de refresh adaptatif selon la visibilité
    const setupInterval = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      const interval = notificationsCache.isPageVisible 
        ? REFRESH_INTERVAL_ACTIVE 
        : REFRESH_INTERVAL_BACKGROUND;
      
      console.log(`⏰ Setup interval: ${interval / 1000}s (page ${notificationsCache.isPageVisible ? 'visible' : 'hidden'})`);
      
      refreshIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchNotifications(false); // Pas forcé, respecte les limitations
        }
      }, interval);
    };
    
    setupInterval();
    
    // AJOUT: Écouter les changements de visibilité pour ajuster l'interval
    const visibilityListener = () => {
      setupInterval();
    };
    
    notificationsCache.listeners.add(visibilityListener);
    
    // Cleanup
    return () => {
      isMountedRef.current = false;
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
      notificationsCache.listeners.delete(visibilityListener);
    };
  }, [fetchNotifications, syncFromCache]);

  // Cleanup global à la destruction du composant
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  // FONCTION markAsRead OPTIMISÉE
  const markAsRead = async (
    notificationId: string,
    closePopover: boolean = false
  ) => {
    try {
      console.log('📝 Marquage notification comme lue:', notificationId);
      
      // Mise à jour optimiste locale d'abord
      const updateNotifications = (prev: Notification[]) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        );
      
      // Mettre à jour tous les états locaux immédiatement
      setNotifications(updateNotifications);
      setAllNotifications(updateNotifications);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      // Mettre à jour le cache global
      notificationsCache.data = updateNotifications(notificationsCache.data);
      notifyListeners();
      
      // Puis faire la requête serveur
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error('Erreur serveur lors du marquage');
      }

      console.log('✅ Notification marquée comme lue côté serveur');

      if (closePopover) {
        setIsDetailOpen(false);
        setSelectedNotification(null);
      }
      
      // MODIFIÉ: Refresh plus modéré - seulement si la page est visible
      if (notificationsCache.isPageVisible) {
        setTimeout(() => {
          if (isMountedRef.current && notificationsCache.isPageVisible) {
            fetchNotifications(false); // Pas forcé
          }
        }, 2000); // 2 secondes au lieu de 500ms
      }

    } catch (error) {
      console.error("❌ Erreur marquage notification:", error);
      toast.error("Erreur lors du marquage de la notification");
      
      // Revenir en arrière en cas d'erreur
      if (notificationsCache.isPageVisible) {
        fetchNotifications(true);
      }
    }
  };

  const openNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);

    // Marquer comme lu automatiquement quand on ouvre le détail
    if (!notification.read) {
      markAsRead(notification._id);
    }
  };

  const getImportanceConfig = (importance: string) => {
    return (
      importanceConfig[importance as keyof typeof importanceConfig] ||
      importanceConfig.medium
    );
  };

  const truncateMessage = (message: string, maxLength: number = 80) => {
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Aujourd'hui";
    if (diffDays === 2) return "Hier";
    if (diffDays <= 7) return `Il y a ${diffDays - 1} jours`;
    return date.toLocaleDateString();
  };

  // FETCH ALL OPTIMISÉ
  const fetchAllNotifications = useCallback(async () => {
    // Si on a déjà les données dans le cache principal, les utiliser
    if (notificationsCache.data.length > 0 && !loadingAll) {
      setAllNotifications(notificationsCache.data);
      return;
    }
    
    if (loadingAll) return;
    
    setLoadingAll(true);
    try {
      const response = await fetch("/api/notifications?all=true", {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await response.json();
      setAllNotifications(data);
      
      // Mettre à jour aussi le cache principal si les données sont plus récentes
      if (data.length > notificationsCache.data.length) {
        notificationsCache.data = data;
        notificationsCache.timestamp = Date.now();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
        notifyListeners();
      }
    } catch (error) {
      console.error("Erreur chargement toutes notifications:", error);
    } finally {
      setLoadingAll(false);
    }
  }, [loadingAll]);

  const openAllNotifications = () => {
    setShowAllNotifications(true);
    fetchAllNotifications();
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: 'PATCH'
      });

      if (response.ok) {
        const updateAllRead = (prev: Notification[]) => prev.map(n => ({ ...n, read: true }));
        
        setNotifications(updateAllRead);
        setAllNotifications(updateAllRead);
        setUnreadCount(0);
        
        // Mettre à jour le cache global
        notificationsCache.data = updateAllRead(notificationsCache.data);
        notifyListeners();
        
        toast.success("Toutes les notifications ont été marquées comme lues");
      }
    } catch (error) {
      console.error("Erreur marquage toutes notifications:", error);
      toast.error("Erreur lors du marquage des notifications");
    }
  };

  // AJOUT: Fonction deleteNotification manquante
  const deleteNotification = async (notificationId: string) => {
    try {
      console.log('🗑️ Suppression notification:', notificationId);
      
      // Mise à jour optimiste locale d'abord
      const updateNotifications = (prev: Notification[]) =>
        prev.filter((n) => n._id !== notificationId);
      
      // Mettre à jour tous les états locaux immédiatement
      setNotifications(updateNotifications);
      setAllNotifications(updateNotifications);
      setUnreadCount((prev) => {
        const notification = notificationsCache.data.find(n => n._id === notificationId);
        return notification && !notification.read ? Math.max(0, prev - 1) : prev;
      });
      
      // Mettre à jour le cache global
      notificationsCache.data = updateNotifications(notificationsCache.data);
      notifyListeners();
      
      // Puis faire la requête serveur
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error('Erreur serveur lors de la suppression');
      }

      console.log('✅ Notification supprimée côté serveur');
      toast.success("Notification supprimée");
      
      // Refresh modéré seulement si la page est visible
      if (notificationsCache.isPageVisible) {
        setTimeout(() => {
          if (isMountedRef.current && notificationsCache.isPageVisible) {
            fetchNotifications(false);
          }
        }, 2000);
      }

    } catch (error) {
      console.error("❌ Erreur suppression notification:", error);
      toast.error("Erreur lors de la suppression de la notification");
      
      // Revenir en arrière en cas d'erreur
      if (notificationsCache.isPageVisible) {
        fetchNotifications(true);
      }
    }
  };

  // Version améliorée du "Voir tout" avec largeur CORRIGÉE
  const AllNotificationsSheet = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [importanceFilter, setImportanceFilter] = useState("all");
    const [readFilter, setReadFilter] = useState("all");
    const [sortBy, setSortBy] = useState<'date' | 'importance'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const filteredNotifications = allNotifications.filter(notification => {
      const matchesSearch = 
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesImportance = importanceFilter === "all" || notification.importance === importanceFilter;
      
      const matchesRead = readFilter === "all" || 
        (readFilter === "read" && notification.read) ||
        (readFilter === "unread" && !notification.read);
      
      return matchesSearch && matchesImportance && matchesRead;
    }).sort((a, b) => {
      let aVal, bVal;
      
      if (sortBy === 'date') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        const importanceOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        aVal = importanceOrder[a.importance];
        bVal = importanceOrder[b.importance];
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    const unreadCount = allNotifications.filter(n => !n.read).length;
    const totalCount = allNotifications.length;

    return (
      <Sheet open={showAllNotifications} onOpenChange={setShowAllNotifications}>
        {/* CORRECTION: Largeur plus raisonnable */}
        <SheetContent side="right" className="w-full sm:w-[600px] md:w-[700px] lg:w-[800px] max-w-[90vw] overflow-hidden flex flex-col">
          <SheetHeader className="pb-6 border-b bg-background/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  Centre de notifications
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez toutes vos notifications en un seul endroit
                </p>
              </div>
              
              {unreadCount > 0 && (
                <Button onClick={markAllAsRead} className="cursor-pointer">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Tout marquer comme lu
                </Button>
              )}
            </div>
            
            {/* Statistiques compactes */}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-muted-foreground">Total: {totalCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-muted-foreground">Non lues: {unreadCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">Lues: {totalCount - unreadCount}</span>
              </div>
            </div>
          </SheetHeader>

          {/* Barre d'outils PLUS COMPACTE */}
          <div className="py-3 border-b bg-muted/10">
            <div className="space-y-3">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtres en ligne plus compacts */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={readFilter} onValueChange={setReadFilter}>
                  <SelectTrigger className="w-24 cursor-pointer text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">Toutes</SelectItem>
                    <SelectItem value="unread" className="cursor-pointer">Non lues</SelectItem>
                    <SelectItem value="read" className="cursor-pointer">Lues</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={importanceFilter} onValueChange={setImportanceFilter}>
                  <SelectTrigger className="w-32 cursor-pointer text-xs">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">Toutes</SelectItem>
                    <SelectItem value="critical" className="cursor-pointer">🔴 Critique</SelectItem>
                    <SelectItem value="high" className="cursor-pointer">🟠 Important</SelectItem>
                    <SelectItem value="medium" className="cursor-pointer">🟡 Normal</SelectItem>
                    <SelectItem value="low" className="cursor-pointer">🟢 Info</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value: 'date' | 'importance') => setSortBy(value)}>
                  <SelectTrigger className="w-28 cursor-pointer text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date" className="cursor-pointer">Par date</SelectItem>
                    <SelectItem value="importance" className="cursor-pointer">Par priorité</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="cursor-pointer p-2"
                >
                  {sortOrder === 'desc' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />}
                </Button>
                
                {/* Réinitialiser plus compact */}
                {(searchQuery || readFilter !== 'all' || importanceFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setReadFilter("all");
                      setImportanceFilter("all");
                    }}
                    className="cursor-pointer text-xs p-2"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
              
              {/* Compteur de résultats plus discret */}
              <div className="text-xs text-muted-foreground">
                {filteredNotifications.length} notification(s)
                {filteredNotifications.length !== totalCount && ` sur ${totalCount}`}
              </div>
            </div>
          </div>

          {/* Liste des notifications avec scroll optimisé */}
          <div className="flex-1 overflow-hidden">
            {loadingAll ? (
              <div className="flex flex-col justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Chargement des notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery || readFilter !== 'all' || importanceFilter !== 'all' 
                    ? "Aucun résultat" 
                    : "Aucune notification"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery || readFilter !== 'all' || importanceFilter !== 'all'
                    ? "Modifiez vos filtres de recherche"
                    : "Vous êtes à jour !"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {filteredNotifications.map((notification, index) => {
                    const config = getImportanceConfig(notification.importance);
                    const IconComponent = config.icon;
                    
                    return (
                      <div
                        key={notification._id}
                        className={`group p-3 rounded-lg transition-all hover:bg-muted/30 relative border ${
                          !notification.read 
                            ? "bg-primary/5 border-primary/20 shadow-sm" 
                            : "bg-background border-transparent hover:border-border/50"
                        }`}
                      >
                        {/* Indicateur non lu plus petit */}
                        {!notification.read && (
                          <div className="absolute left-1 top-3 w-2 h-2 bg-primary rounded-full"></div>
                        )}
                        
                        <div className="flex items-start gap-3 ml-3">
                          {/* Icône plus compacte */}
                          <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                            <IconComponent className={`w-4 h-4 ${config.color}`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* En-tête compact */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-medium text-sm leading-tight ${
                                  !notification.read ? 'text-foreground' : 'text-muted-foreground'
                                } line-clamp-1`}>
                                  {notification.title}
                                </h3>
                                
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDate(notification.createdAt)}</span>
                                  {notification.sender && (
                                    <>
                                      <span>•</span>
                                      <span className="font-medium">{notification.sender.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <Badge 
                                variant="outline" 
                                className={`${config.color} border-current text-xs px-1.5 py-0.5`}
                              >
                                {config.label}
                              </Badge>
                            </div>
                            
                            {/* Message plus compact */}
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
                              {notification.message}
                            </p>
                            
                            {/* Actions compactes */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                {notification.message.length > 150 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openNotificationDetail(notification)}
                                    className="cursor-pointer text-xs h-6 px-2 hover:bg-primary/10"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Plus
                                  </Button>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification._id)}
                                    className="cursor-pointer text-xs h-6 px-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteNotification(notification._id)}
                                  className="cursor-pointer text-xs h-6 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Séparateur subtil */}
                        {index < filteredNotifications.length - 1 && (
                          <div className="absolute bottom-0 left-12 right-2 h-px bg-border/20"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[11px] font-medium text-white flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-96 p-0"
          align="center"
          side="bottom"
          sideOffset={8}
        >
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Notifications</h4>
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer text-xs"
                onClick={openAllNotifications}
              >
                Voir tout
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[400px]">
            {initialLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-3"></div>
                <p className="font-medium mb-1">Chargement des notifications...</p>
                <p className="text-xs">Veuillez patienter</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium mb-1">Aucune notification</p>
                <p className="text-xs">Vous êtes à jour !</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 10).map((notification) => {
                  const config = getImportanceConfig(notification.importance);
                  const IconComponent = config.icon;
                  const isLongMessage = notification.message.length > 80;

                  return (
                    <div
                      key={notification._id}
                      className={`group p-4 transition-colors relative ${
                        !notification.read
                          ? "bg-muted/30"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      {/* Indicateur non lu */}
                      {!notification.read && (
                        <div className="absolute left-2 top-6 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      )}

                      <div className="flex items-start gap-3 ml-4">
                        {/* Icône d'importance */}
                        <div
                          className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}
                        >
                          <IconComponent className={`w-4 h-4 ${config.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* En-tête */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h5
                              className={`font-medium text-sm line-clamp-1 ${
                                !notification.read
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {notification.title}
                            </h5>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Badge d'importance */}
                              <Badge
                                variant="outline"
                                className={`text-xs ${config.color} border-current`}
                              >
                                {config.label}
                              </Badge>

                              {/* CORRECTION: Bouton marquer comme lu avec l'icône CheckCircle2 */}
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification._id);
                                  }}
                                  title="Marquer comme lu"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Message */}
                          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                            {truncateMessage(notification.message)}
                          </p>

                          {/* Actions et métadonnées */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(notification.createdAt)}</span>
                              {notification.sender && (
                                <>
                                  <span>•</span>
                                  <span>{notification.sender.name}</span>
                                </>
                              )}
                            </div>

                            {isLongMessage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="cursor-pointer text-xs h-6 px-2"
                                onClick={() => openNotificationDetail(notification)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Lire la suite
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Voir plus */}
                {notifications.length > 10 && (
                  <div className="p-4 text-center border-t">
                    <Link href="/dashboard/notifications">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                      >
                        Voir {notifications.length - 10} notification(s) de plus
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <AllNotificationsSheet />

      {/* Dialog de détail de notification */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {selectedNotification && (
                <>
                  <div
                    className={`p-2 rounded-lg ${getImportanceConfig(
                      selectedNotification.importance
                    ).bgColor}`}
                  >
                    {(() => {
                      const IconComponent = getImportanceConfig(
                        selectedNotification.importance
                      ).icon;
                      return (
                        <IconComponent
                          className={`w-5 h-5 ${getImportanceConfig(
                            selectedNotification.importance
                          ).color}`}
                        />
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-left">
                      {selectedNotification.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getImportanceConfig(
                          selectedNotification.importance
                        ).color} border-current`}
                      >
                        {getImportanceConfig(selectedNotification.importance).label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(selectedNotification.createdAt)}
                      </span>
                      {selectedNotification.sender && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            Par {selectedNotification.sender.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogHeader>

          {selectedNotification && (
            <>
              <Separator />
              <div className="py-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.message}
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className="cursor-pointer"
                >
                  Fermer
                </Button>
                {!selectedNotification.read && (
                  <Button
                    onClick={() => markAsRead(selectedNotification._id, true)}
                    className="cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marquer comme lu
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
