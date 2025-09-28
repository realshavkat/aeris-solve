"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Search, 
  Clock, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Filter,
  CheckCheck, // Remplacer MarkAsRead par CheckCheck
  Trash2,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  createdAt: string;
  sender?: {
    name: string;
  };
}

const importanceConfig = {
  low: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/20', label: 'Info' },
  medium: { icon: Bell, color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-950/20', label: 'Normal' },
  high: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/20', label: 'Important' },
  critical: { icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950/20', label: 'Critique' }
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?all=true");
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
      toast.error("Erreur lors du chargement des notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        toast.success("Notification marquée comme lue");
      }
    } catch (error) {
      console.error("Erreur marquage notification:", error);
      toast.error("Erreur lors du marquage de la notification");
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: 'PATCH'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success("Toutes les notifications ont été marquées comme lues");
      }
    } catch (error) {
      console.error("Erreur marquage toutes notifications:", error);
      toast.error("Erreur lors du marquage des notifications");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        toast.success("Notification supprimée");
      }
    } catch (error) {
      console.error("Erreur suppression notification:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getImportanceConfig = (importance: string) => {
    return importanceConfig[importance as keyof typeof importanceConfig] || importanceConfig.medium;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesImportance = importanceFilter === "all" || notification.importance === importanceFilter;
    
    const matchesRead = readFilter === "all" || 
      (readFilter === "read" && notification.read) ||
      (readFilter === "unread" && !notification.read);
    
    return matchesSearch && matchesImportance && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              Mes Notifications
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : "Toutes les notifications sont lues"}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} className="cursor-pointer">
            <CheckCheck className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={importanceFilter} onValueChange={setImportanceFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes importances</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="high">Important</SelectItem>
                <SelectItem value="medium">Normal</SelectItem>
                <SelectItem value="low">Info</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="unread">Non lues</SelectItem>
                <SelectItem value="read">Lues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Notifications ({filteredNotifications.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Aucune notification trouvée</h3>
              <p>Aucune notification ne correspond à vos filtres.</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredNotifications.map((notification) => {
                  const config = getImportanceConfig(notification.importance);
                  const IconComponent = config.icon;
                  
                  return (
                    <div
                      key={notification._id}
                      className={`group p-6 transition-colors relative ${
                        !notification.read ? "bg-muted/30" : "hover:bg-muted/20"
                      }`}
                    >
                      {/* Indicateur non lu */}
                      {!notification.read && (
                        <div className="absolute left-4 top-8 w-3 h-3 bg-primary rounded-full"></div>
                      )}
                      
                      <div className="flex items-start gap-4 ml-6">
                        {/* Icône d'importance */}
                        <div className={`p-3 rounded-xl ${config.bgColor} flex-shrink-0`}>
                          <IconComponent className={`w-5 h-5 ${config.color}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* En-tête */}
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className={`font-semibold text-lg ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </h3>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge 
                                variant="outline" 
                                className={`${config.color} border-current`}
                              >
                                {config.label}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Message */}
                          <p className="text-sm text-muted-foreground mb-4 leading-relaxed whitespace-pre-wrap">
                            {notification.message}
                          </p>
                          
                          {/* Métadonnées et actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDate(notification.createdAt)}</span>
                              </div>
                              {notification.sender && (
                                <div className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>Par {notification.sender.name}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.read && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsRead(notification._id)}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Marquer comme lu
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteNotification(notification._id)}
                                className="cursor-pointer text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
