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
import { Switch } from "@/components/ui/switch";
import {
  Target,
  Plus,
  Search,
  Check, // Ajout de l'import manquant
  X,
  Users,
  Calendar,
  User,
  MoreHorizontal,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2, // Ajout de l'import manquant
} from "lucide-react";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
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

interface Mission {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'in_progress' | 'completed' | 'cancelled';
  assignedUsers: Array<{
    id: string;
    name: string;
    discordId: string;
  }>;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const priorityOptions = [
  { value: 'low', label: 'Basse', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '📘' },
  { value: 'medium', label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🎯' },
  { value: 'high', label: 'Élevée', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🔥' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-700 border-red-200', icon: '⚡' }
];

const statusOptions = [
  { value: 'in_progress', label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'completed', label: 'Terminée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle }
];

export default function AdminMissionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
  
  // Formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>('medium');
  const [sendNotification, setSendNotification] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    fetchUsers();
    fetchMissions();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.filter((user: User) => user.status === 'approved'));
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    }
  };

  const fetchMissions = async () => {
    try {
      const response = await fetch("/api/admin/missions");
      if (response.ok) {
        const data = await response.json();
        setMissions(data);
      }
    } catch (error) {
      console.error("Erreur chargement missions:", error);
      toast.error("Erreur lors du chargement des missions");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(user => user._id)));
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

  const handleEditMission = (mission: Mission) => {
    setEditingMission(mission);
    // Pré-remplir le formulaire avec les données de la mission
    setTitle(mission.title);
    setDescription(mission.description);
    setPriority(mission.priority);
    setSendNotification(false); // Par défaut, ne pas envoyer de notification lors de la modification
    setSelectedUsers(new Set(mission.assignedUsers.map(user => user.id)));
  };

  const handleCreateMission = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Le titre et la description sont requis");
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error("Veuillez sélectionner au moins un utilisateur");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          sendNotification,
          assignedUserIds: Array.from(selectedUsers)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      const result = await response.json();
      
      toast.success(`Mission créée avec succès`, {
        description: sendNotification ? 
          `${result.notificationsSent} notification(s) envoyée(s), ${result.discordMessagesSent} message(s) Discord` :
          "Mission créée sans notification",
        duration: 5000,
      });

      resetForm();
      setShowCreateDialog(false);
      await fetchMissions();
    } catch (error) {
      console.error("Erreur création mission:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création de la mission");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateMission = async () => {
    if (!editingMission) return;
    
    if (!title.trim() || !description.trim()) {
      toast.error("Le titre et la description sont requis");
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error("Veuillez sélectionner au moins un utilisateur");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/admin/missions/${editingMission._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          assignedUserIds: Array.from(selectedUsers)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la mise à jour");
      }

      toast.success("Mission mise à jour avec succès");
      resetForm();
      await fetchMissions();
    } catch (error) {
      console.error("Erreur mise à jour mission:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour de la mission");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (missionId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/missions/${missionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      toast.success("Statut de la mission mis à jour");
      await fetchMissions();
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleDeleteMission = async () => {
    if (!missionToDelete) return;

    try {
      const response = await fetch(`/api/admin/missions/${missionToDelete._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast.success('Mission supprimée avec succès');
      await fetchMissions();
      setShowDeleteDialog(false);
      setMissionToDelete(null);
    } catch (error) {
      console.error('Erreur suppression mission:', error);
      toast.error('Erreur lors de la suppression de la mission');
    }
  };

  const openDeleteDialog = (mission: Mission) => {
    setMissionToDelete(mission);
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority('medium');
    setSendNotification(true);
    setSelectedUsers(new Set());
    setEditingMission(null);
  };

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = 
      mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.assignedUsers.some(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || mission.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || mission.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Séparer les missions en cours des autres
  const inProgressMissions = filteredMissions.filter(m => m.status === 'in_progress');
  const completedCancelledMissions = filteredMissions.filter(m => m.status !== 'in_progress');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      {/* Header - Style unifié */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Gestion des missions
          </h1>
          <p className="text-muted-foreground">
            Créez et gérez les missions assignées aux utilisateurs
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle mission
        </Button>
      </div>

      {/* Stats Cards - Style unifié */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Missions</p>
                <p className="text-3xl font-bold">{missions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En cours</p>
                <p className="text-3xl font-bold text-blue-600">
                  {missions.filter(m => m.status === 'in_progress').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Terminées</p>
                <p className="text-3xl font-bold text-green-600">
                  {missions.filter(m => m.status === 'completed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Annulées</p>
                <p className="text-3xl font-bold text-red-600">
                  {missions.filter(m => m.status === 'cancelled').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres - Style unifié */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des missions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des missions - Style table unifié */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Missions ({filteredMissions.length})</span>
            <div className="text-sm font-normal text-muted-foreground">
              {inProgressMissions.length} en cours • {completedCancelledMissions.length} terminées/annulées
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredMissions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Aucune mission trouvée</h3>
              <p className="mb-6">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? "Aucune mission ne correspond à vos filtres"
                  : "Commencez par créer une nouvelle mission"}
              </p>
              {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
                <Button onClick={() => setShowCreateDialog(true)} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une mission
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Mission</th>
                    <th className="text-left p-4 font-medium">Priorité</th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Assignés</th>
                    <th className="text-left p-4 font-medium">Créé le</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...inProgressMissions, ...completedCancelledMissions].map((mission) => {
                    const priority = priorityOptions.find(p => p.value === mission.priority);
                    const status = statusOptions.find(s => s.value === mission.status);
                    const StatusIcon = status?.icon || Clock;
                    const isCompleted = mission.status !== 'in_progress';

                    return (
                      <tr key={mission._id} className={`hover:bg-muted/20 transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-lg mt-1">{priority?.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium line-clamp-1">{mission.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {mission.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-4">
                          {priority && (
                            <Badge variant="outline" className={`${priority.color} border`}>
                              {priority.label}
                            </Badge>
                          )}
                        </td>
                        
                        <td className="p-4">
                          {status && (
                            <Badge variant="outline" className={`${status.color} border`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          )}
                        </td>
                        
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{mission.assignedUsers.length}</span>
                            {mission.assignedUsers.length > 0 && (
                              <div className="flex -space-x-1">
                                {mission.assignedUsers.slice(0, 3).map((user) => (
                                  <div
                                    key={user.id}
                                    className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium"
                                    title={user.name}
                                  >
                                    {user.name[0]?.toUpperCase()}
                                  </div>
                                ))}
                                {mission.assignedUsers.length > 3 && (
                                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                    +{mission.assignedUsers.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {new Date(mission.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditMission(mission)} className="cursor-pointer">
                                <Edit3 className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(mission._id, 'completed')}
                                className="cursor-pointer text-green-600"
                                disabled={mission.status === 'completed'}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Marquer terminée
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(mission._id, 'cancelled')}
                                className="cursor-pointer text-red-600"
                                disabled={mission.status === 'cancelled'}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Annuler
                              </DropdownMenuItem>
                              {mission.status !== 'in_progress' && (
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(mission._id, 'in_progress')}
                                  className="cursor-pointer text-blue-600"
                                >
                                  <Clock className="mr-2 h-4 w-4" />
                                  Remettre en cours
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(mission)}
                                className="cursor-pointer text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={() => {
        if (!creating) {
          setShowDeleteDialog(false);
          setMissionToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la mission &quot;{missionToDelete?.title}&quot; ?
              Cette action est irréversible et supprimera définitivement la mission.
              {missionToDelete?.assignedUsers && missionToDelete.assignedUsers.length > 0 && (
                <span className="block mt-2 font-medium text-amber-600 dark:text-amber-400">
                  ⚠️ {missionToDelete.assignedUsers.length} utilisateur(s) sont actuellement assigné(s) à cette mission.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={creating}
              className="cursor-pointer"
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMission}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
              disabled={creating}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de création/modification */}
      <CreateMissionDialog
        open={showCreateDialog || !!editingMission}
        onClose={() => {
          setShowCreateDialog(false);
          resetForm();
        }}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        priority={priority}
        setPriority={setPriority}
        sendNotification={sendNotification}
        setSendNotification={setSendNotification}
        users={users}
        selectedUsers={selectedUsers}
        onUserSelect={handleUserSelect}
        onSelectAll={handleSelectAll}
        onSubmit={editingMission ? handleUpdateMission : handleCreateMission}
        isSubmitting={creating}
        isEditing={!!editingMission}
        editingMission={editingMission}
      />
    </div>
  );
}

// Composant pour le dialog de création/modification - VERSION AMÉLIORÉE
interface CreateMissionDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  priority: string;
  setPriority: (priority: string) => void;
  sendNotification: boolean;
  setSendNotification: (sendNotification: boolean) => void;
  users: User[];
  selectedUsers: Set<string>;
  onUserSelect: (userId: string) => void;
  onSelectAll: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
  editingMission?: Mission | null;
}

function CreateMissionDialog({
  open,
  onClose,
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  sendNotification,
  setSendNotification,
  users,
  selectedUsers,
  onUserSelect,
  onSelectAll,
  onSubmit,
  isSubmitting,
  isEditing = false,
  editingMission = null
}: CreateMissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {isEditing ? 'Modifier la mission' : 'Créer une nouvelle mission'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de la mission</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la mission"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description détaillée de la mission"
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isEditing && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="notification"
                  checked={sendNotification}
                  onCheckedChange={setSendNotification}
                />
                <Label htmlFor="notification">Envoyer une notification aux utilisateurs assignés</Label>
              </div>
            )}

            {isEditing && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Mode modification :</strong> Les notifications ne sont pas envoyées lors de la modification pour éviter le spam.
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base font-semibold">Membres assignés à la mission</Label>
            
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                className="cursor-pointer"
              >
                {selectedUsers.size === users.length ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Désélectionner tout
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Sélectionner tout ({users.length})
                  </>
                )}
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {selectedUsers.size} membre(s) assigné(s)
              </span>
            </div>

            <ScrollArea className="h-56 border rounded-lg">
              <div className="p-3 space-y-2">
                {users.map((user: User) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => onUserSelect(user._id)}
                  >
                    <Checkbox
                      checked={selectedUsers.has(user._id)}
                      onChange={() => onUserSelect(user._id)}
                    />
                    
                    <Avatar className="w-10 h-10">
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

                    {/* Indicateur si la personne était déjà assignée */}
                    {isEditing && editingMission?.assignedUsers.some((assignedUser: Record<string, unknown>) => assignedUser.id === user._id) && (
                      <Badge variant="secondary" className="text-xs">
                        Déjà assigné
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {isEditing && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <strong>Conseil :</strong> Vous pouvez ajouter de nouveaux membres ou retirer des membres existants. 
                Les changements prendront effet immédiatement.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || selectedUsers.size === 0 || !title.trim() || !description.trim()}
            className="cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                {isEditing ? 'Mise à jour...' : 'Création...'}
              </>
            ) : (
              <>
                {isEditing ? <Edit3 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {isEditing ? `Mettre à jour la mission (${selectedUsers.size})` : `Créer la mission (${selectedUsers.size})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
