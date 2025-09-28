"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Send, 
  Users, 
  Search, 
  Check, 
  X,
  MessageCircle,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  _id: string;
  discordId: string;
  discordUsername: string;
  anonymousNickname?: string;
  rpName?: string;
  role: string;
  status: string;
  avatar?: string;
}

interface SentNotification {
  _id: string;
  title: string;
  message: string;
  recipientCount: number;
  createdAt: string;
  sender: {
    name: string;
  };
}

export default function AdminNotificationsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Formulaire
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [importance, setImportance] = useState('medium');
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
    fetchSentNotifications();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  const fetchSentNotifications = async () => {
    try {
      const response = await fetch("/api/admin/notifications/sent");
      if (response.ok) {
        const data = await response.json();
        setSentNotifications(data);
      }
    } catch (error) {
      console.error("Erreur chargement notifications:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.discordUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.anonymousNickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.rpName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user._id)));
    }
  };

  const handleUserSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Le titre et le message sont requis");
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error("Veuillez sélectionner au moins un utilisateur");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          userIds: Array.from(selectedUsers),
          importance: importance // Ajout de l'importance
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'envoi");
      }

      const result = await response.json();
      
      toast.success(`Notification envoyée à ${selectedUsers.size} utilisateur(s)`, {
        description: `${result.discordMessagesSent || 0} message(s) Discord envoyé(s)`,
        duration: 5000,
      });

      // Réinitialiser le formulaire
      setTitle("");
      setMessage("");
      setImportance('medium');
      setSelectedUsers(new Set());
      
      // Recharger les notifications envoyées
      await fetchSentNotifications();
    } catch (error) {
      console.error("Erreur envoi notification:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'envoi de la notification");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Envoyer des notifications aux utilisateurs de la plateforme
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulaire d'envoi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Nouvelle notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Titre et message */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de la notification"
                  maxLength={100}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {title.length}/100
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Contenu de la notification"
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {message.length}/500
                </div>
              </div>

              {/* Niveau d'importance */}
              <div className="space-y-2">
                <Label htmlFor="importance">Niveau d&apos;importance</Label>
                <Select value={importance} onValueChange={setImportance}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">📘 Info - Information générale</SelectItem>
                    <SelectItem value="medium">🔔 Normal - Notification standard</SelectItem>
                    <SelectItem value="high">⚠️ Important - Nécessite attention</SelectItem>
                    <SelectItem value="critical">🚨 Critique - Action requise immédiatement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Filtres utilisateurs */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Destinataires</Label>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher des utilisateurs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous rôles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Membre</SelectItem>
                    <SelectItem value="visitor">Visiteur</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="rejected">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="cursor-pointer"
                >
                  {selectedUsers.size === filteredUsers.length ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Désélectionner tout
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Sélectionner tout ({filteredUsers.length})
                    </>
                  )}
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.size} utilisateur(s) sélectionné(s)
                </span>
              </div>
            </div>

            {/* Liste des utilisateurs */}
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                    onClick={() => handleUserSelect(user._id)}
                  >
                    <Checkbox
                      checked={selectedUsers.has(user._id)}
                      onChange={() => handleUserSelect(user._id)}
                    />
                    
                    <Avatar className="w-8 h-8">
                      <AvatarImage 
                        src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined}
                      />
                      <AvatarFallback>
                        {user.anonymousNickname?.[0] || user.discordUsername[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {user.anonymousNickname || user.discordUsername}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.rpName || "Nom RP non défini"}
                      </p>
                    </div>
                  </div>
                ))}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun utilisateur trouvé</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Button
              onClick={handleSendNotification}
              disabled={sending || selectedUsers.size === 0 || !title.trim() || !message.trim()}
              className="w-full cursor-pointer"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer la notification ({selectedUsers.size})
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Historique des notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Notifications récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {sentNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune notification envoyée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentNotifications.map((notification) => (
                    <div
                      key={notification._id}
                      className="p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-medium line-clamp-1">
                          {notification.title}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {notification.recipientCount} destinataire(s)
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {notification.sender.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
