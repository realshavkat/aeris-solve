"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  Clock,
  Crown,
  Shield,
  Calendar,
  MoreHorizontal,
  Check,
  X,
  Eye,
  Trash2,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  Activity,
  Edit,
  Save,
  Mail
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface User {
  _id: string;
  discordId: string;
  discordUsername: string;
  discordDiscriminator?: string;
  avatar?: string;
  rpName?: string;
  anonymousNickname?: string;
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  role: 'member' | 'admin' | 'visitor';
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
}

const statusOptions = [
  { value: 'pending', label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800', icon: <Clock className="w-3 h-3" /> },
  { value: 'approved', label: 'Approuvé', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800', icon: <UserCheck className="w-3 h-3" /> },
  { value: 'rejected', label: 'Refusé', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800', icon: <UserX className="w-3 h-3" /> },
  { value: 'banned', label: 'Banni', color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800', icon: <X className="w-3 h-3" /> },
];

const defaultRoleOptions = [
  { value: 'visitor', label: 'Visiteur', color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800', icon: <Eye className="w-3 h-3" /> },
  { value: 'member', label: 'Membre', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: <UserCheck className="w-3 h-3" /> },
  { value: 'admin', label: 'Administrateur', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800', icon: <Crown className="w-3 h-3" /> },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'ban' | 'unban' | 'delete' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState({
    rpName: '',
    anonymousNickname: '',
    role: '',
    status: ''
  });
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [pendingUserDetails, setPendingUserDetails] = useState<User | null>(null);
  const [activeUserTab, setActiveUserTab] = useState("all");
  const [customRoles, setCustomRoles] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchCustomRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        throw new Error('Erreur chargement utilisateurs');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setCustomRoles(data);
      }
    } catch (error) {
      console.error('Erreur chargement rôles personnalisés:', error);
    }
  };

  const handleUserAction = async (userId: string, action: string, newRole?: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          ...(newRole && { role: newRole })
        }),
      });

      if (response.ok) {
        await fetchUsers();
        toast.success(getActionSuccessMessage(action));
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'action');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'action');
    } finally {
      setIsSubmitting(false);
      setActionUser(null);
      setActionType(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchUsers();
        toast.success('Utilisateur supprimé avec succès');
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
      setActionUser(null);
      setActionType(null);
    }
  };

  const getActionSuccessMessage = (action: string) => {
    switch (action) {
      case 'approve': return 'Utilisateur approuvé avec succès';
      case 'reject': return 'Utilisateur refusé';
      case 'ban': return 'Utilisateur banni';
      case 'unban': return 'Utilisateur débanni';
      default: return 'Action effectuée avec succès';
    }
  };

  const fetchPendingUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/details`);
      if (response.ok) {
        const data = await response.json();
        setPendingUserDetails(data);
        setShowPendingDetails(true);
      } else {
        throw new Error('Erreur lors du chargement des détails');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des détails utilisateur');
    }
  };

  const handleQuickAction = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          role: action === 'approve' ? 'member' : undefined
        }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowPendingDetails(false);
        setPendingUserDetails(null);
        toast.success(action === 'approve' ? 'Utilisateur approuvé' : 'Demande refusée');
      } else {
        throw new Error('Erreur lors de l\'action');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'action');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserData({
      rpName: user.rpName || '',
      anonymousNickname: user.anonymousNickname || '',
      role: user.role,
      status: user.status
    });
    setShowEditUser(true);
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          rpName: editUserData.rpName.trim(),
          anonymousNickname: editUserData.anonymousNickname.trim(),
          role: editUserData.role,
          status: editUserData.status
        }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowEditUser(false);
        setEditingUser(null);
        toast.success('Utilisateur modifié avec succès');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la modification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredUsersByTab = () => {
    let baseUsers = users;
    
    switch (activeUserTab) {
      case 'pending':
        baseUsers = users.filter(u => u.status === 'pending');
        break;
      case 'approved':
        baseUsers = users.filter(u => u.status === 'approved');
        break;
      case 'rejected':
        baseUsers = users.filter(u => u.status === 'rejected');
        break;
      case 'banned':
        baseUsers = users.filter(u => u.status === 'banned');
        break;
      default:
        baseUsers = users;
    }

    return baseUsers.filter(user => {
      const matchesSearch = 
        user.discordUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.rpName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (user.anonymousNickname?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return (a.anonymousNickname || a.discordUsername).localeCompare(b.anonymousNickname || b.discordUsername);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'role':
          return a.role.localeCompare(b.role);
        default:
          return 0;
      }
    });
  };

  const getUserStats = () => {
    const total = users.length;
    const pending = users.filter(u => u.status === 'pending').length;
    const approved = users.filter(u => u.status === 'approved').length;
    const rejected = users.filter(u => u.status === 'rejected').length;
    const banned = users.filter(u => u.status === 'banned').length;
    const admins = users.filter(u => u.role === 'admin').length;
    
    return { total, pending, approved, rejected, banned, admins };
  };

  const stats = getUserStats();
  const filteredUsers = getFilteredUsersByTab();
  const pendingUsers = users.filter(u => u.status === 'pending');

  // Mettre à jour les options de rôles pour inclure UNIQUEMENT les rôles personnalisés + les 3 de base
  const getAllRoleOptions = () => {
    // Créer une map pour éviter les doublons
    const roleMap = new Map();
    
    // Ajouter les rôles par défaut
    defaultRoleOptions.forEach(role => {
      roleMap.set(role.value, role);
    });

    // Ajouter les rôles personnalisés (ils écraseront les rôles par défaut s'ils ont le même nom)
    customRoles.forEach(role => {
      roleMap.set(role.name, {
        value: role.name,
        label: role.name,
        color: `border-2`,
        icon: <span style={{color: role.color}} className="text-sm">{role.icon}</span>,
        customColor: role.color,
        style: {
          borderColor: role.color,
          backgroundColor: `${role.color}15`,
          color: role.color
        }
      });
    });

    return Array.from(roleMap.values());
  };

  const allRoleOptions = getAllRoleOptions();

  // Fonction pour obtenir les options d'un rôle spécifique
  const getRoleOption = (roleName: string) => {
    return allRoleOptions.find(option => option.value === roleName) || 
           { value: roleName, label: roleName, color: 'bg-gray-100 text-gray-800', icon: <span>?</span> };
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header avec gradient moderne */}
      <div className="relative overflow-hidden bg-gradient-to-br from-green-500/5 via-blue-500/5 to-purple-500/10 rounded-2xl p-8 border border-border/50">
        <div className="absolute inset-0 bg-grid-white/5 bg-grid-16" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-green-100 dark:bg-green-950 rounded-2xl shadow-lg">
              <Users className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Gestion des utilisateurs
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Administrez les comptes utilisateurs et leurs permissions
              </p>
            </div>
          </div>
          
          {/* Statistiques en ligne */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">En attente</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-muted-foreground">Approuvés</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-muted-foreground">Refusés</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-gray-600">{stats.banned}</div>
              <div className="text-sm text-muted-foreground">Bannis</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-purple-600">{stats.admins}</div>
              <div className="text-sm text-muted-foreground">Admins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte pour les demandes en attente */}
      {stats.pending > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-950 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                  {stats.pending} demande{stats.pending > 1 ? 's' : ''} en attente
                </h3>
                <p className="text-yellow-700 dark:text-yellow-400">
                  {stats.pending > 1 ? 'Des utilisateurs attendent' : 'Un utilisateur attend'} votre approbation pour rejoindre la plateforme.
                </p>
              </div>
              <Button
                onClick={() => setStatusFilter('pending')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Traiter les demandes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onglets */}
      <Tabs value={activeUserTab} onValueChange={setActiveUserTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="cursor-pointer">
            Tous ({users.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="cursor-pointer">
            En attente ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="approved" className="cursor-pointer">
            Approuvés ({stats.approved})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="cursor-pointer">
            Refusés ({stats.rejected})
          </TabsTrigger>
          <TabsTrigger value="banned" className="cursor-pointer">
            Bannis ({stats.banned})
          </TabsTrigger>
        </TabsList>

        {/* Filtres et recherche - MISE À JOUR */}
        <div className="bg-card rounded-xl p-6 border shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, Discord, RP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">Tous les rôles</SelectItem>
                {defaultRoleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      {option.icon}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
                {customRoles.map(role => (
                  <SelectItem key={role.name} value={role.name} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span style={{color: role.color}}>{role.icon}</span>
                      {role.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent" className="cursor-pointer">Plus récents</SelectItem>
                <SelectItem value="name" className="cursor-pointer">Nom A-Z</SelectItem>
                <SelectItem value="status" className="cursor-pointer">Statut</SelectItem>
                <SelectItem value="role" className="cursor-pointer">Rôle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contenu des onglets - MISE À JOUR */}
        <TabsContent value={activeUserTab} className="space-y-4">
          {/* Demandes en attente spéciales */}
          {activeUserTab === 'pending' && pendingUsers.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Demandes en attente de traitement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {pendingUsers.slice(0, 3).map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage 
                            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined}
                          />
                          <AvatarFallback>
                            {(user.anonymousNickname || user.discordUsername)[0]?.toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.anonymousNickname || 'Non défini'}</div>
                          <div className="text-sm text-muted-foreground">{user.discordUsername}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => fetchPendingUserDetails(user._id)}
                          className="cursor-pointer"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUserAction(user._id, 'approve', 'member')}
                          className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approuver
                        </Button>
                        <Button 
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setActionUser(user);
                            setActionType('reject');
                          }}
                          className="cursor-pointer"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingUsers.length > 3 && (
                    <div className="text-center text-sm text-muted-foreground">
                      Et {pendingUsers.length - 3} autre{pendingUsers.length - 3 > 1 ? 's' : ''} demande{pendingUsers.length - 3 > 1 ? 's' : ''}...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des utilisateurs - MISE À JOUR */}
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium mb-2">Aucun utilisateur trouvé</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || roleFilter !== 'all'
                      ? "Aucun utilisateur ne correspond à vos filtres"
                      : "Aucun utilisateur dans cette catégorie"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredUsers.map((user) => {
                const status = statusOptions.find(s => s.value === user.status);
                const role = getRoleOption(user.role); // CHANGEMENT ICI
                
                return (
                  <Card key={user._id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex gap-6">
                        {/* Avatar */}
                        <Avatar className="w-16 h-16 border-4 border-background shadow-lg">
                          <AvatarImage 
                            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined}
                            alt={user.anonymousNickname || user.discordUsername}
                          />
                          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950">
                            {(user.anonymousNickname || user.discordUsername)[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Contenu principal */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-xl font-semibold group-hover:text-green-600 transition-colors">
                                  {user.anonymousNickname || user.discordUsername}
                                </h3>
                                {status && (
                                  <Badge className={`${status.color} font-medium`} variant="outline">
                                    {status.icon}
                                    <span className="ml-1">{status.label}</span>
                                  </Badge>
                                )}
                                {role && (
                                  <Badge 
                                    className={`${role.style ? '' : role.color} font-medium`} 
                                    variant="outline"
                                    style={role.style || {}}
                                  >
                                    {role.icon}
                                    <span className="ml-1">{role.label}</span>
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Discord:</span>
                                  <span className="font-mono">
                                    {user.discordDiscriminator && user.discordDiscriminator !== '0' 
                                      ? `${user.discordUsername}#${user.discordDiscriminator}` 
                                      : user.discordUsername}
                                  </span>
                                </div>
                                {user.rpName && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">RP:</span>
                                    <span>{user.rpName}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Inscrit le {new Date(user.createdAt).toLocaleDateString()}</span>
                                </div>
                                {user.lastActivity && (
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    <span>Dernière activité: {new Date(user.lastActivity).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions rapides pour les demandes en attente */}
                            {user.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fetchPendingUserDetails(user._id)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Détails
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleUserAction(user._id, 'approve', 'member')}
                                  disabled={isSubmitting}
                                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approuver
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setActionUser(user);
                                    setActionType('reject');
                                  }}
                                  disabled={isSubmitting}
                                  className="cursor-pointer"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Refuser
                                </Button>
                              </div>
                            )}

                            {/* Menu d'actions pour tous les utilisateurs */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDialog(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Voir les détails
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                
                                {user.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={() => handleUserAction(user._id, 'approve', 'member')}
                                    >
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Approuver
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="cursor-pointer text-destructive"
                                      onClick={() => {
                                        setActionUser(user);
                                        setActionType('reject');
                                      }}
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Refuser
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {user.status === 'approved' && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-destructive"
                                    onClick={() => {
                                      setActionUser(user);
                                      setActionType('ban');
                                    }}
                                  >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Bannir
                                  </DropdownMenuItem>
                                )}

                                {user.status === 'banned' && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer"
                                    onClick={() => handleUserAction(user._id, 'unban', 'member')}
                                  >
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Débannir
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem 
                                  className="text-destructive cursor-pointer"
                                  onClick={() => {
                                    setActionUser(user);
                                    setActionType('delete');
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer définitivement
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog détails demande en attente */}
      {pendingUserDetails && (
        <Dialog open={showPendingDetails} onOpenChange={setShowPendingDetails}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={pendingUserDetails.avatar ? `https://cdn.discordapp.com/avatars/${pendingUserDetails.discordId}/${pendingUserDetails.avatar}.png` : undefined}
                  />
                  <AvatarFallback>
                    {(pendingUserDetails.anonymousNickname || pendingUserDetails.discordUsername)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                Demande d'accès en attente
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-300">En attente depuis</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {new Date(pendingUserDetails.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Surnom anonyme</label>
                  <div className="p-3 bg-muted/20 rounded-lg border">
                    <p className="font-medium">{pendingUserDetails.anonymousNickname || 'Non défini'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Nom RP</label>
                  <div className="p-3 bg-muted/20 rounded-lg border">
                    <p className="font-medium">{pendingUserDetails.rpName || 'Non défini'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Discord</label>
                  <div className="p-3 bg-muted/20 rounded-lg border">
                    <p className="font-mono text-sm">
                      {pendingUserDetails.discordDiscriminator && pendingUserDetails.discordDiscriminator !== '0' 
                        ? `${pendingUserDetails.discordUsername}#${pendingUserDetails.discordDiscriminator}` 
                        : pendingUserDetails.discordUsername}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">ID Discord</label>
                  <div className="p-3 bg-muted/20 rounded-lg border">
                    <p className="font-mono text-sm">{pendingUserDetails.discordId}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowPendingDetails(false)}
                className="cursor-pointer"
              >
                Fermer
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleQuickAction(pendingUserDetails._id, 'reject')}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 mr-2" />
                Refuser
              </Button>
              <Button 
                onClick={() => handleQuickAction(pendingUserDetails._id, 'approve')}
                className="bg-green-600 hover:bg-green-700 cursor-pointer"
              >
                <Check className="w-4 h-4 mr-2" />
                Approuver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog modification utilisateur - MISE À JOUR */}
      {editingUser && (
        <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={editingUser.avatar ? `https://cdn.discordapp.com/avatars/${editingUser.discordId}/${editingUser.avatar}.png` : undefined}
                  />
                  <AvatarFallback>
                    {(editingUser.anonymousNickname || editingUser.discordUsername)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                Modifier {editingUser.anonymousNickname || editingUser.discordUsername}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Surnom anonyme</Label>
                  <Input
                    value={editUserData.anonymousNickname}
                    onChange={(e) => setEditUserData({ ...editUserData, anonymousNickname: e.target.value })}
                    placeholder="Surnom public"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom RP</Label>
                  <Input
                    value={editUserData.rpName}
                    onChange={(e) => setEditUserData({ ...editUserData, rpName: e.target.value })}
                    placeholder="Nom de personnage RP"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={editUserData.role} onValueChange={(value) => setEditUserData({ ...editUserData, role: value })}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            {option.icon}
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={editUserData.status} onValueChange={(value) => setEditUserData({ ...editUserData, status: value })}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            {option.icon}
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Informations non modifiables */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3 text-muted-foreground">Informations Discord (non modifiables)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Discord</label>
                    <div className="p-3 bg-muted/20 rounded-lg border border-dashed">
                      <p className="font-mono text-sm">
                        {editingUser.discordDiscriminator && editingUser.discordDiscriminator !== '0' 
                          ? `${editingUser.discordUsername}#${editingUser.discordDiscriminator}` 
                          : editingUser.discordUsername}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">ID Discord</label>
                    <div className="p-3 bg-muted/20 rounded-lg border border-dashed">
                      <p className="font-mono text-sm">{editingUser.discordId}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline"
                onClick={() => setShowEditUser(false)}
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveUserEdit}
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de confirmation d'action */}
      <AlertDialog open={actionUser !== null && actionType !== null} onOpenChange={() => {
        if (!isSubmitting) {
          setActionUser(null);
          setActionType(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'reject' && 'Refuser cette demande ?'}
              {actionType === 'ban' && 'Bannir cet utilisateur ?'}
              {actionType === 'delete' && 'Supprimer cet utilisateur ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'reject' && `Êtes-vous sûr de vouloir refuser la demande de ${actionUser?.anonymousNickname || actionUser?.discordUsername} ?`}
              {actionType === 'ban' && `Êtes-vous sûr de vouloir bannir ${actionUser?.anonymousNickname || actionUser?.discordUsername} ? L'utilisateur ne pourra plus accéder à la plateforme.`}
              {actionType === 'delete' && `Êtes-vous sûr de vouloir supprimer définitivement ${actionUser?.anonymousNickname || actionUser?.discordUsername} ? Cette action est irréversible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="cursor-pointer">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionUser && actionType) {
                  if (actionType === 'delete') {
                    handleDeleteUser(actionUser._id);
                  } else {
                    handleUserAction(actionUser._id, actionType);
                  }
                }
              }}
              className={`cursor-pointer ${
                actionType === 'delete' || actionType === 'ban' 
                  ? 'bg-destructive hover:bg-destructive/90' 
                  : ''
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "En cours..." : 
               actionType === 'reject' ? "Refuser" :
               actionType === 'ban' ? "Bannir" :
               actionType === 'delete' ? "Supprimer" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog détails utilisateur */}
      {selectedUser && (
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={selectedUser.avatar ? `https://cdn.discordapp.com/avatars/${selectedUser.discordId}/${selectedUser.avatar}.png` : undefined}
                  />
                  <AvatarFallback>
                    {(selectedUser.anonymousNickname || selectedUser.discordUsername)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                Détails de {selectedUser.anonymousNickname || selectedUser.discordUsername}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Surnom anonyme</label>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    {selectedUser.anonymousNickname || 'Non défini'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Nom RP</label>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    {selectedUser.rpName || 'Non défini'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Discord</label>
                  <div className="p-3 bg-muted/20 rounded-lg font-mono text-sm">
                    {selectedUser.discordDiscriminator && selectedUser.discordDiscriminator !== '0' 
                      ? `${selectedUser.discordUsername}#${selectedUser.discordDiscriminator}` 
                      : selectedUser.discordUsername}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">ID Discord</label>
                  <div className="p-3 bg-muted/20 rounded-lg font-mono text-sm">
                    {selectedUser.discordId}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    {statusOptions.find(s => s.value === selectedUser.status)?.label || selectedUser.status}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Rôle</label>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    {defaultRoleOptions.find(r => r.value === selectedUser.role)?.label || selectedUser.role}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Inscrit le</label>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    {new Date(selectedUser.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Dernière modification</label>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    {new Date(selectedUser.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setShowUserDialog(false)} className="cursor-pointer">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}