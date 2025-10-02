"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  FolderIcon, 
  Users, 
  Calendar,
  MoreHorizontal,
  Trash2,
  Edit,
  Save,
  X,
  Key,
  ImageIcon,
  Crown,
  Copy,
  UserMinus,
  User,
  FileText, // Ajout de l'import pour l'icône des rapports
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import Image from "next/image";

interface Folder {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  accessKey?: string;
  createdAt: string;
  lastModified: string;
  reportsCount: number;
  membersCount: number;
  creator: {
    name: string;
    discordId: string;
  };
  ownerId: string;
  members?: Array<{
    id: string;
    name: string;
    image?: string;
  }>;
}

interface Report {
  _id: string;
  title: string;
  content: string;
  importance: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: {
    name: string;
    discordId: string;
  };
  folder: {
    _id: string;
    title: string;
  };
}

interface User {
  _id: string;
  discordUsername: string;
  anonymousNickname?: string;
  avatar?: string;
  discordId: string;
}

export default function AdminFoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [users, setUsers] = useState<User[]>([]); // CORRECTION: État initialisé
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showEditFolder, setShowEditFolder] = useState(false);
  const [editFolderData, setEditFolderData] = useState({ 
    title: '', 
    description: '', 
    coverImage: '', 
    ownerId: '',
    accessKey: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAccessKeyDialog, setShowAccessKeyDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showOwnerDialog, setShowOwnerDialog] = useState(false);
  const [showViewReportsDialog, setShowViewReportsDialog] = useState(false);
  const [folderReports] = useState<Report[]>([]);
  const [loadingReports] = useState(false);

  // CORRECTION: Supprimer les références incorrectes à useParams/useSearchParams
  // const params = useParams<{ folderId: string }>(); 
  // const folderId = params.folderId;                 
  // const searchParams = useSearchParams();
  // const isAdminMode = searchParams.get("adminMode") === "true";

  // CORRECTION: Fonction fetchFolders corrigée
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      
      // CORRECTION: Utiliser l'endpoint folders normal avec paramètre admin
      const response = await fetch('/api/folders?admin=true');
      
      if (response.ok) {
        const data = await response.json();
        setFolders(Array.isArray(data) ? data : []);
      } else {
        console.error('Erreur lors du chargement des dossiers:', response.status);
        setFolders([]);
        toast.error('Erreur lors du chargement des dossiers');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setFolders([]);
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  }, []);

  // CORRECTION: Fonction pour charger les utilisateurs
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        console.error('Erreur lors du chargement des utilisateurs');
        setUsers([]);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setUsers([]);
    }
  }, []);

  // CORRECTION: Effect principal pour charger les données
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchFolders(),
        fetchUsers()
      ]);
    };
    
    loadData();
  }, [fetchFolders, fetchUsers]);

  const handleSaveFolderEdit = async (section: 'info' | 'owner' | 'accessKey' = 'info') => {
    if (!selectedFolder) return;

    setIsSubmitting(true);
    try {
      let dataToSend: Record<string, unknown> = {};
      
      if (section === 'info') {
        dataToSend = {
          title: editFolderData.title,
          description: editFolderData.description,
          coverImage: editFolderData.coverImage
        };
      } else if (section === 'owner') {
        dataToSend = {
          ownerId: editFolderData.ownerId
        };
      } else if (section === 'accessKey') {
        dataToSend = {
          accessKey: editFolderData.accessKey
        };
      }

      // CORRECTION: Utiliser l'endpoint folders normal avec admin=true
      const response = await fetch(`/api/folders/${selectedFolder._id}?admin=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        await fetchFolders();
        
        if (section === 'info') setShowEditFolder(false);
        else if (section === 'owner') setShowOwnerDialog(false);
        else if (section === 'accessKey') setShowAccessKeyDialog(false);
        
        let successMessage = '';
        if (section === 'info') successMessage = 'Informations du dossier mises à jour';
        else if (section === 'owner') successMessage = 'Propriétaire du dossier modifié';
        else if (section === 'accessKey') successMessage = 'Clé d\'accès mise à jour';
        
        toast.success(successMessage);
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

  const handleImageUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("L'image est trop lourde. Maximum 8MB.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://canary.discord.com/api/webhooks/1420888439116533812/r4--yUIo_aITGMWSg8lLINz_k-vz___cMc5NMT8Osg-jduCKAvFAiVAbWCMkdUvmqXDF', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.attachments?.[0]?.url) {
        setEditFolderData({ ...editFolderData, coverImage: data.attachments[0].url });
        toast.success("Image téléchargée avec succès");
      }
    } catch (error) {
      toast.error(`Erreur lors du téléchargement de l'image ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action est irréversible.')) {
      return;
    }

    try {
      // CORRECTION: Utiliser l'endpoint folders normal avec admin=true
      const response = await fetch(`/api/folders/${folderId}?admin=true`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFolders();
        toast.success('Dossier supprimé avec succès');
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression du dossier');
    }
  };

  const generateAccessKey = () => {
    const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setEditFolderData({ ...editFolderData, accessKey: newKey });
  };

  const copyAccessKey = () => {
    if (editFolderData.accessKey) {
      navigator.clipboard.writeText(editFolderData.accessKey);
      toast.success('Clé d\'accès copiée');
    }
  };

  const getFilteredFolders = () => {
    return folders.filter(folder =>
      folder.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.creator.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        case 'reports':
          return b.reportsCount - a.reportsCount;
        case 'members':
          return b.membersCount - a.membersCount;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  };

  const handleRemoveMember = async (folderId: string, memberId: string) => {
    try {
      // CORRECTION: Utiliser l'endpoint folders normal avec admin=true
      const response = await fetch(`/api/folders/${folderId}/members/${memberId}?admin=true`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (selectedFolder) {
          setSelectedFolder({
            ...selectedFolder,
            members: selectedFolder.members?.filter(m => m.id !== memberId) || []
          });
        }
        
        await fetchFolders();
        toast.success('Membre retiré avec succès');
      } else {
        throw new Error('Erreur lors de la suppression du membre');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression du membre');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedFolder) return;

    try {
      // CORRECTION: Utiliser l'endpoint folders normal avec admin=true
      const response = await fetch(`/api/folders/${selectedFolder._id}/members?admin=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        
        setSelectedFolder({
          ...selectedFolder,
          members: data.members || []
        });
        
        await fetchFolders();
        toast.success('Membre ajouté avec succès');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'ajout du membre');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout du membre');
    }
  };

  // CORRECTION: Affichage conditionnel pour éviter le rendu avec des données manquantes
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Chargement des dossiers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header avec gradient moderne */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/10 rounded-2xl p-8 border border-border/50">
        <div className="absolute inset-0 bg-grid-white/5 bg-grid-16" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-blue-100 dark:bg-blue-950 rounded-2xl shadow-lg">
              <FolderIcon className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Gestion des dossiers
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Administrez l&apos;ensemble des dossiers et rapports de la plateforme
              </p>
            </div>
          </div>
          
          {/* Statistiques en ligne */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-blue-600">{folders.length}</div>
              <div className="text-sm text-muted-foreground">Dossiers total</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-green-600">
                {folders.reduce((total, folder) => total + folder.reportsCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Rapports total</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-purple-600">
                {new Set(folders.map(f => f.creator.discordId)).size}
              </div>
              <div className="text-sm text-muted-foreground">Créateurs actifs</div>
            </div>
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-orange-600">
                {folders.filter(f => 
                  new Date(f.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Cette semaine</div>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-card rounded-xl p-6 border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des dossiers..."
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
              <SelectItem value="title" className="cursor-pointer">Titre A-Z</SelectItem>
              <SelectItem value="reports" className="cursor-pointer">Nb. rapports</SelectItem>
              <SelectItem value="members" className="cursor-pointer">Nb. membres</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des dossiers avec design moderne */}
      <div className="space-y-4">
        {getFilteredFolders().length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-medium mb-2">Aucun dossier trouvé</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Aucun dossier ne correspond à votre recherche" : "Aucun dossier n'a été créé"}
              </p>
            </CardContent>
          </Card>
        ) : (
          getFilteredFolders().map((folder) => (
            <Card key={folder._id} className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {/* Image de couverture moderne */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 flex items-center justify-center flex-shrink-0 shadow-md">
                    {folder.coverImage ? (
                      <Image 
                        src={folder.coverImage} 
                        alt={folder.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FolderIcon className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  
                  {/* Contenu principal */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                            {folder.title}
                          </h3>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                            {folder.reportsCount} rapport{folder.reportsCount !== 1 ? 's' : ''}
                          </Badge>
                          {folder.accessKey && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                              <Key className="w-3 h-3 mr-1" />
                              Privé
                            </Badge>
                          )}
                        </div>

                        <p className="text-muted-foreground leading-relaxed">
                          {folder.description}
                        </p>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Créé le {new Date(folder.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{folder.membersCount} membre{folder.membersCount !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4" />
                            <span>Par {folder.creator.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedFolder(folder);
                                setEditFolderData({
                                  ...editFolderData,
                                  title: folder.title,
                                  description: folder.description,
                                  coverImage: folder.coverImage || '',
                                });
                                setShowEditFolder(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier les infos
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                // CORRECTION: Ouvrir avec le bon paramètre
                                window.open(`/dashboard/folders/${folder._id}?admin=true`, '_blank');
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Voir les rapports
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedFolder(folder);
                                setEditFolderData({
                                  ...editFolderData,
                                  ownerId: folder.ownerId
                                });
                                setShowOwnerDialog(true);
                              }}
                            >
                              <Crown className="w-4 h-4 mr-2" />
                              Changer propriétaire
                            </DropdownMenuItem>
                            

                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedFolder(folder);
                                setShowMembersDialog(true);
                              }}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Gérer les membres
                            </DropdownMenuItem>
                            

                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedFolder(folder);
                                setEditFolderData({
                                  ...editFolderData,
                                  accessKey: folder.accessKey || ''
                                });
                                setShowAccessKeyDialog(true);
                              }}
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Clé d&apos;accès
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              className="text-destructive cursor-pointer"
                              onClick={() => handleDeleteFolder(folder._id)}
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

      {/* Dialog pour l'édition des infos principales du dossier */}
      {selectedFolder && (
        <Dialog open={showEditFolder} onOpenChange={setShowEditFolder}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifier les informations du dossier</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Informations de base */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Titre</Label>
                  <Input
                    id="edit-title"
                    value={editFolderData.title}
                    onChange={(e) => setEditFolderData({ ...editFolderData, title: e.target.value })}
                    placeholder="Titre du dossier"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editFolderData.description}
                    onChange={(e) => setEditFolderData({ ...editFolderData, description: e.target.value })}
                    placeholder="Description du dossier"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Image de couverture</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('imageInput')?.click()}
                      disabled={isUploading}
                      className="cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {isUploading ? "Envoi..." : "Changer l'image"}
                    </Button>
                    {editFolderData.coverImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditFolderData({ ...editFolderData, coverImage: '' })}
                        className="cursor-pointer"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  {editFolderData.coverImage && (
                    <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-md border">
                      <Image
                        src={editFolderData.coverImage}
                        alt="Aperçu"
                        width={400}
                        height={225}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => setShowEditFolder(false)} 
                variant="outline" 
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button 
                onClick={() => handleSaveFolderEdit('info')} 
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

      {/* Dialog pour changer le propriétaire */}
      {selectedFolder && (
        <Dialog open={showOwnerDialog} onOpenChange={setShowOwnerDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Changer le propriétaire du dossier</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Label>Nouveau propriétaire</Label>
              <Select 
                value={editFolderData.ownerId} 
                onValueChange={(value) => setEditFolderData({ ...editFolderData, ownerId: value })}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user._id} value={user._id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined} />
                          <AvatarFallback className="text-xs">
                            {(user.anonymousNickname || user.discordUsername)[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.anonymousNickname || user.discordUsername}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-4 bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Le changement de propriétaire donnera à l&apos;utilisateur sélectionné un contrôle total sur ce dossier.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => setShowOwnerDialog(false)} 
                variant="outline" 
                className="cursor-pointer"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => handleSaveFolderEdit('owner')} 
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enregistrement..." : "Changer le propriétaire"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog pour gérer la clé d'accès */}
      {selectedFolder && (
        <Dialog open={showAccessKeyDialog} onOpenChange={setShowAccessKeyDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Gérer la clé d&apos;accès</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Label>Clé d&apos;accès (optionnel)</Label>
              <div className="flex gap-2">
                <Input
                  value={editFolderData.accessKey}
                  onChange={(e) => setEditFolderData({ ...editFolderData, accessKey: e.target.value })}
                  placeholder="Clé d'accès pour rejoindre le dossier"
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={generateAccessKey}
                  className="cursor-pointer"
                >
                  Générer
                </Button>
                {editFolderData.accessKey && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={copyAccessKey}
                    className="cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Les utilisateurs pourront rejoindre ce dossier avec cette clé.
                {!editFolderData.accessKey && " Si aucune clé n'est définie, le dossier est public."}
              </p>

              {editFolderData.accessKey && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800 mt-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Les utilisateurs peuvent rejoindre ce dossier avec la clé: <span className="font-mono">{editFolderData.accessKey}</span>
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                onClick={() => setShowAccessKeyDialog(false)} 
                variant="outline" 
                className="cursor-pointer"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => handleSaveFolderEdit('accessKey')} 
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog pour gérer les membres */}
      {selectedFolder && (
        <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Gérer les membres</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Membres du dossier</Label>
                  <Badge>
                    {selectedFolder.members?.length || 0} membre{selectedFolder.members?.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <ScrollArea className="h-[300px] border rounded-lg p-4">
                  {selectedFolder.members && selectedFolder.members.length > 0 ? (
                    <div className="space-y-3">
                      {selectedFolder.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={member.image} />
                              <AvatarFallback className="text-sm">
                                {member.name[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.name}</span>
                            {member.id === selectedFolder.ownerId && (
                              <Badge variant="outline" className="text-xs">
                                <Crown className="w-3 h-3 mr-1" />
                                Propriétaire
                              </Badge>
                            )}
                          </div>
                          {member.id !== selectedFolder.ownerId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(selectedFolder._id, member.id)}
                            >
                              <UserMinus className="w-4 h-4" />
                              <span className="sr-only">Retirer</span>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Users className="w-12 h-12 mb-2 opacity-20" />
                      <p>Aucun membre</p>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Ajouter un nouveau membre */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Ajouter un membre</h4>
                <Select onValueChange={handleAddMember}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Sélectionner un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter(user => !selectedFolder.members?.some(member => member.id === user._id))
                      .map(user => (
                        <SelectItem key={user._id} value={user._id} className="cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined} />
                              <AvatarFallback className="text-xs">
                                {(user.anonymousNickname || user.discordUsername)[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {user.anonymousNickname || user.discordUsername}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowMembersDialog(false)} className="cursor-pointer">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog pour voir les rapports */}
      {selectedFolder && (
        <Dialog open={showViewReportsDialog} onOpenChange={setShowViewReportsDialog}>
          <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Rapports de &quot;{selectedFolder.title}&quot;
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {folderReports.length} rapport{folderReports.length !== 1 ? 's' : ''} dans ce dossier
                </p>
                <Badge variant="outline">
                  {selectedFolder.reportsCount} total
                </Badge>
              </div>

              <ScrollArea className="h-[400px] border rounded-lg">
                {loadingReports ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : folderReports.length > 0 ? (
                  <div className="p-4 space-y-4">
                    {folderReports.map((report) => (
                      <div key={report._id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{(report as Report & { icon?: string }).icon ?? "📄"}</span>
                              <h3 className="font-medium">{report.title}</h3>
                              <Badge 
                                variant="outline" 
                                className={
                                  report.importance === 'critical' ? 'border-red-500 text-red-700' :
                                  report.importance === 'high' ? 'border-orange-500 text-orange-700' :
                                  report.importance === 'medium' ? 'border-blue-500 text-blue-700' :
                                  'border-gray-500 text-gray-700'
                                }
                              >
                                {report.importance === 'critical' ? 'Critique' :
                                 report.importance === 'high' ? 'Important' :
                                 report.importance === 'medium' ? 'Normal' : 'Faible'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {report.content.length > 150 
                                ? report.content.substring(0, 150) + '...' 
                                : report.content}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {report.author.name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(report.createdAt).toLocaleDateString()}
                              </div>
                              {report.tags && report.tags.length > 0 && (
                                <div className="flex gap-1">
                                  {report.tags.slice(0, 2).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {report.tags.length > 2 && (
                                    <span className="text-xs">+{report.tags.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/dashboard/folders/${selectedFolder._id}`, '_blank')}
                            className="cursor-pointer"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Ouvrir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <FileText className="w-12 h-12 mb-2 opacity-20" />
                    <p>Aucun rapport dans ce dossier</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => setShowViewReportsDialog(false)} 
                className="cursor-pointer"
              >
                Fermer
              </Button>
              <Button 
                onClick={() => window.open(`/dashboard/folders/${selectedFolder._id}`, '_blank')}
                variant="outline"
                className="cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-2" />
                Ouvrir le dossier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}