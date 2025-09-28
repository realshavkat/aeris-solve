"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Search, 
  Shield, 
  Users, 
  Plus,
  Calendar,
  MoreHorizontal,
  Trash2,
  Edit,
  Save,
  Crown,
  Settings,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Role {
  _id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  isDefault: boolean;
  permissions: Record<string, boolean>;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

// Icônes disponibles pour les rôles - CORRECTION DES DOUBLONS
const roleIcons = [
  '👤', '👑', '🛡️', '⚔️', '🎭', '🎨', '🎯', '🎪', '🎵', '🎸',
  '🏆', '🏅', '💎', '💫', '⭐', '🌟', '✨', '🔥', '⚡', '💥',
  '🚀', '🛸', '🎊', '🎉', '🎈', '🎁', '🎀', '💝', '💖', '💕',
  '🔮', '🪄', '🎲', '🏀', '⚽', '🎾', '🏓', '🎳', '🎮', '🎺',
  '🎻', '🎹', '🥁', '🎤', '🎧', '🎬', '🎥', '📱', '💻', '⌚',
  '🔧', '🔨', '⚙️', '🛠️', '🔩', '⚒️', '🪛', '🔐', '🗝️', '🔑'
];

// Permissions disponibles
const availablePermissions = [
  { key: 'viewDashboard', label: 'Voir le tableau de bord', description: 'Accès au tableau de bord principal' },
  { key: 'createFolders', label: 'Créer des dossiers', description: 'Peut créer de nouveaux dossiers' },
  { key: 'editOwnFolders', label: 'Modifier ses dossiers', description: 'Peut modifier ses propres dossiers' },
  { key: 'editAllFolders', label: 'Modifier tous les dossiers', description: 'Peut modifier tous les dossiers' },
  { key: 'deleteOwnFolders', label: 'Supprimer ses dossiers', description: 'Peut supprimer ses propres dossiers' },
  { key: 'deleteAllFolders', label: 'Supprimer tous les dossiers', description: 'Peut supprimer tous les dossiers' },
  { key: 'createReports', label: 'Créer des rapports', description: 'Peut créer de nouveaux rapports' },
  { key: 'editOwnReports', label: 'Modifier ses rapports', description: 'Peut modifier ses propres rapports' },
  { key: 'editAllReports', label: 'Modifier tous les rapports', description: 'Peut modifier tous les rapports' },
  { key: 'deleteOwnReports', label: 'Supprimer ses rapports', description: 'Peut supprimer ses propres rapports' },
  { key: 'deleteAllReports', label: 'Supprimer tous les rapports', description: 'Peut supprimer tous les rapports' },
  { key: 'joinFolders', label: 'Rejoindre des dossiers', description: 'Peut rejoindre des dossiers avec une clé' },
  { key: 'manageProfile', label: 'Gérer son profil', description: 'Peut modifier son profil utilisateur' }
];

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6b7280',
    icon: '👤',
    isDefault: false,
    permissions: {} as Record<string, boolean>
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      } else {
        throw new Error('Erreur chargement rôles');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des rôles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Le nom et la description sont requis');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchRoles();
        setShowCreateRole(false);
        resetForm();
        toast.success('Rôle créé avec succès');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole || !formData.name.trim() || !formData.description.trim()) {
      toast.error('Le nom et la description sont requis');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchRoles();
        setShowEditRole(false);
        setSelectedRole(null);
        resetForm();
        toast.success('Rôle modifié avec succès');
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

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchRoles();
        setShowDeleteDialog(false);
        setSelectedRole(null);
        toast.success('Rôle supprimé avec succès');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6b7280',
      icon: '👤',
      isDefault: false,
      permissions: {}
    });
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      color: role.color,
      icon: role.icon,
      isDefault: role.isDefault,
      permissions: role.permissions || {}
    });
    setShowEditRole(true);
  };

  const getFilteredAndSortedRoles = () => {
    return roles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'users':
          return b.userCount - a.userCount;
        default:
          return 0;
      }
    });
  };

  const getRoleStats = () => {
    const totalRoles = roles.length;
    const defaultRoles = roles.filter(r => r.isDefault).length;
    const totalUsers = roles.reduce((sum, role) => sum + role.userCount, 0);
    const recentRoles = roles.filter(r => 
      new Date(r.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;

    return { totalRoles, defaultRoles, totalUsers, recentRoles };
  };

  const stats = getRoleStats();
  const filteredRoles = getFilteredAndSortedRoles();

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
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-red-500/10 rounded-2xl p-8 border border-border/50">
        <div className="absolute inset-0 bg-grid-white/5 bg-grid-16" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-purple-100 dark:bg-purple-950 rounded-2xl shadow-lg">
              <Shield className="w-10 h-10 text-purple-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Gestion des rôles
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Créez et gérez les rôles et permissions des utilisateurs
              </p>
            </div>
          </div>
          
          {/* Statistiques en ligne */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-purple-600">{stats.totalRoles}</div>
              <div className="text-sm text-muted-foreground">Rôles total</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-pink-600">{stats.defaultRoles}</div>
              <div className="text-sm text-muted-foreground">Rôles par défaut</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-muted-foreground">Utilisateurs total</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-green-600">{stats.recentRoles}</div>
              <div className="text-sm text-muted-foreground">Cette semaine</div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et actions */}
      <div className="bg-card rounded-xl p-6 border shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des rôles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent" className="cursor-pointer">Plus récents</SelectItem>
                <SelectItem value="name" className="cursor-pointer">Nom A-Z</SelectItem>
                <SelectItem value="users" className="cursor-pointer">Nb. utilisateurs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => setShowCreateRole(true)} 
            className="bg-purple-600 hover:bg-purple-700 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau rôle
          </Button>
        </div>
      </div>

      {/* Liste des rôles */}
      <div className="space-y-4">
        {filteredRoles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">Aucun rôle trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Aucun rôle ne correspond à votre recherche" : "Commencez par créer votre premier rôle"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateRole(true)} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un rôle
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredRoles.map((role) => (
            <Card key={role._id} className="group hover:shadow-lg transition-all duration-200 border-l-4" style={{borderLeftColor: role.color}}>
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {/* Icône du rôle */}
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shadow-md flex-shrink-0"
                    style={{backgroundColor: `${role.color}20`, border: `2px solid ${role.color}30`}}
                  >
                    {role.icon}
                  </div>
                  
                  {/* Contenu principal */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold group-hover:text-purple-600 transition-colors">
                            {role.name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className="font-medium"
                            style={{color: role.color, borderColor: role.color, backgroundColor: `${role.color}10`}}
                          >
                            {role.userCount} utilisateur{role.userCount !== 1 ? 's' : ''}
                          </Badge>
                          {role.isDefault && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                              <Crown className="w-3 h-3 mr-1" />
                              Par défaut
                            </Badge>
                          )}
                        </div>

                        <p className="text-muted-foreground leading-relaxed">
                          {role.description}
                        </p>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Créé le {new Date(role.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            <span>{Object.keys(role.permissions || {}).length} permission{Object.keys(role.permissions || {}).length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            // TODO: Ouvrir la liste des utilisateurs avec ce rôle
                          }}
                          className="cursor-pointer hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Utilisateurs
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => openEditDialog(role)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              className="text-destructive cursor-pointer"
                              onClick={() => {
                                setSelectedRole(role);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog création de rôle */}
      <Dialog open={showCreateRole} onOpenChange={() => {
        setShowCreateRole(false);
        resetForm();
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Créer un nouveau rôle
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Informations de base */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du rôle</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Modérateur"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#6b7280"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du rôle et de ses responsabilités"
                  rows={3}
                  required
                />
              </div>

              {/* Sélection d'icône */}
              <div className="space-y-2">
                <Label>Icône du rôle</Label>
                <div className="grid grid-cols-10 gap-2 p-4 border rounded-lg max-h-32 overflow-y-auto">
                  {roleIcons.map((icon, index) => (
                    <button
                      key={`${icon}-${index}`} // CHANGEMENT ICI : utiliser icon + index pour éviter les doublons
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg hover:bg-muted transition-colors ${
                        formData.icon === icon 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                          : 'border-border'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Rôle par défaut pour les nouveaux utilisateurs</Label>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Permissions</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availablePermissions.map((permission) => (
                    <div key={permission.key} className="flex items-start space-x-3 p-3 rounded-lg border bg-card/50">
                      <Switch
                        id={permission.key}
                        checked={formData.permissions[permission.key] || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [permission.key]: checked
                          }
                        })}
                      />
                      <div className="flex-1">
                        <Label htmlFor={permission.key} className="font-medium cursor-pointer">
                          {permission.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setShowCreateRole(false);
                resetForm();
              }}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateRole}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Créer le rôle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog modification de rôle */}
      <Dialog open={showEditRole} onOpenChange={() => {
        setShowEditRole(false);
        setSelectedRole(null);
        resetForm();
      }}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-600" />
              Modifier le rôle &quot;{selectedRole?.name}&quot;
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Informations de base */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nom du rôle</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Modérateur"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#6b7280"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du rôle et de ses responsabilités"
                  rows={3}
                  required
                />
              </div>

              {/* Sélection d'icône */}
              <div className="space-y-2">
                <Label>Icône du rôle</Label>
                <div className="grid grid-cols-10 gap-2 p-4 border rounded-lg max-h-32 overflow-y-auto">
                  {roleIcons.map((icon, index) => (
                    <button
                      key={`edit-${icon}-${index}`} // CHANGEMENT ICI : ajouter préfixe "edit-" + icon + index
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg hover:bg-muted transition-colors ${
                        formData.icon === icon 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                          : 'border-border'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="edit-isDefault">Rôle par défaut pour les nouveaux utilisateurs</Label>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Permissions</Label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {availablePermissions.map((permission) => (
                    <div key={permission.key} className="flex items-start space-x-3 p-3 rounded-lg border bg-card/50">
                      <Switch
                        id={`edit-${permission.key}`}
                        checked={formData.permissions[permission.key] || false}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [permission.key]: checked
                          }
                        })}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`edit-${permission.key}`} className="font-medium cursor-pointer">
                          {permission.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setShowEditRole(false);
                setSelectedRole(null);
                resetForm();
              }}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleEditRole}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Modification...
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

      {/* Dialog suppression de rôle */}
      <AlertDialog open={showDeleteDialog} onOpenChange={() => {
        if (!isSubmitting) {
          setShowDeleteDialog(false);
          setSelectedRole(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le rôle &quot;{selectedRole?.name}&quot; ?
              Cette action est irréversible.
              {selectedRole?.userCount > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Ce rôle est utilisé par {selectedRole.userCount} utilisateur{selectedRole.userCount > 1 ? 's' : ''}.
                  Vous ne pouvez pas le supprimer.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="cursor-pointer">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
              disabled={isSubmitting || (selectedRole?.userCount || 0) > 0}
            >
              {isSubmitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
