"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Folder, Lock, Share2, UserPlus, Search, Users, Calendar, Eye } from "lucide-react";
import { CreateFolderDialog } from "./create-folder-dialog";
import { EditFolderDialog } from "./edit-folder-dialog";
import { JoinFolderDialog } from "./join-folder-dialog";
import { ShareFolderDialog } from "./share-folder-dialog";
import { ManageMembersDialog } from "./manage-members-dialog";
import type { Folder as ManageMembersFolder } from "./manage-members-dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FolderActions } from "./folder-actions";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { usePermissions } from "@/hooks/use-permissions";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label"; // AJOUT DE L'IMPORT MANQUANT

// Type pour étendre la session avec le rôle
interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  status?: string;
  role?: string;
}

// Mettre à jour l'interface Folder
interface Folder {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  accessKey: string;
  createdAt: string;
  lastModified: Date;
  reportsCount: number;
  members?: {
    id: string;
    name: string;
    image?: string;
  }[];
  ownerId: string;
  creator: {
    name: string;
    discordId: string;
  };
}

export default function FoldersView() {
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [sharingFolder, setSharingFolder] = useState<Folder | null>(null);
  const [managingMembersFolder, setManagingMembersFolder] = useState<Folder | null>(null);
  const [search, setSearch] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  
  // CORRECTION: État pour éviter les boucles
  const [isInitialized, setIsInitialized] = useState(false);

  // CORRECTION: Fonction fetchFolders avec useCallback SANS adminMode et session dans les dépendances
  const fetchFolders = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const endpoint = adminMode && (session.user as ExtendedUser).role === 'admin' 
        ? '/api/admin/folders' 
        : '/api/folders';
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      } else {
        throw new Error('Erreur chargement dossiers');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setIsLoading(false);
    }
  }, [adminMode, session?.user]); // CORRECTION: Pas de dépendances pour éviter les boucles

  // CORRECTION: Effet d'initialisation unique
  useEffect(() => {
    if (!session?.user || isInitialized) return;
    
    console.log('🚀 Initialisation FoldersView');
    setIsInitialized(true);
    fetchFolders();
  }, [session?.user, isInitialized, fetchFolders]);

  // CORRECTION: Effet séparé pour le changement de mode admin
  useEffect(() => {
    if (!isInitialized) return;
    
    console.log('🔄 Changement mode admin:', adminMode);
    
    // Refetch avec un délai pour éviter les requêtes simultanées
    const timeoutId = setTimeout(() => {
      if (session?.user) {
        setIsLoading(true);
        const endpoint = adminMode && (session.user as ExtendedUser).role === 'admin' 
          ? '/api/admin/folders' 
          : '/api/folders';
        
        fetch(endpoint)
          .then(response => response.ok ? response.json() : Promise.reject())
          .then(data => setFolders(data))
          .catch(error => {
            console.error('Erreur:', error);
            toast.error('Erreur lors du chargement des dossiers');
          })
          .finally(() => setIsLoading(false));
      }
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [adminMode, isInitialized, session?.user]); // CORRECTION: Ajout de session?.user

  const handleFolderCreated = (folder: Record<string, unknown>) => {
    const newFolder = folder as unknown as Folder;
    setFolders(prev => [newFolder, ...prev]);
  };

  const handleFolderJoined = (folder: Record<string, unknown>) => {
    const newFolder = folder as unknown as Folder;
    setFolders(prev => {
      const exists = prev.some(f => f._id === newFolder._id);
      if (exists) return prev;
      return [newFolder, ...prev];
    });
    toast.success("Vous avez rejoint le dossier avec succès");
  };

  const navigateToFolder = (folderId: string) => {
    // AJOUT: Sauvegarder la page actuelle AVEC plus de détails
    const currentUrl = window.location.href;
    sessionStorage.setItem('previousPage', currentUrl);
    console.log('💾 Page sauvegardée avant navigation:', currentUrl);
    
    // CORRECTION: Ne pas activer le mode admin si c'est notre propre dossier
    const folder = folders.find(f => f._id === folderId);
    const isOwnFolder = folder?.ownerId === session?.user?.id;
    
    console.log('📁 Navigation vers dossier:', folderId);
    console.log('👤 Est notre dossier:', isOwnFolder);
    console.log('🔧 Admin mode actuel:', adminMode);
    
    // Seulement ajouter adminMode si on est admin ET que ce n'est pas notre dossier
    const shouldUseAdminMode = adminMode && (session?.user as ExtendedUser)?.role === 'admin' && !isOwnFolder;
    const adminParam = shouldUseAdminMode ? '?adminMode=true' : '';
    
    console.log('➡️ Navigation vers:', `/dashboard/folders/${folderId}${adminParam}`);
    
    router.push(`/dashboard/folders/${folderId}${adminParam}`);
  };

  const handleShare = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    setSharingFolder(folder);
  };

  const handleManageMembers = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
    setManagingMembersFolder(folder);
  };
  const handleMembersUpdated = (updatedFolder: ManageMembersFolder) => {
    setFolders(prev => prev.map(f => 
      f._id === updatedFolder._id ? { ...f, ...updatedFolder } : f
    ));
  };

  // Filtrage par recherche
  const filteredFolders: Folder[] = folders.filter((folder: Folder): boolean => {
    const q: string = search.trim().toLowerCase();
    if (!q) return true;
    return (
      folder.title.toLowerCase().includes(q) ||
      folder.description.toLowerCase().includes(q) ||
      folder.creator?.name.toLowerCase().includes(q)
    );
  });

  // CORRECTION: Vérifier session ET initialisation
  if (!session?.user || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header sobre */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes dossiers</h1>
          <p className="text-muted-foreground text-base">Retrouvez tous vos dossiers et ceux partagés avec vous.</p>
        </div>
        <div className="flex gap-2">
          {hasPermission('joinFolders') && (
            <Button onClick={() => setIsJoinOpen(true)} variant="outline" className="cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              Rejoindre un dossier
            </Button>
          )}
          {hasPermission('createFolders') && (
            <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau dossier
            </Button>
          )}
        </div>
      </div>

      {/* Toggle Mode Admin - visible uniquement pour les admins */}
      {(session?.user as ExtendedUser)?.role === 'admin' && (
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg border bg-card mb-4">
          <Switch
            id="admin-mode"
            checked={adminMode}
            onCheckedChange={setAdminMode}
          />
          <Label htmlFor="admin-mode" className="text-sm font-medium cursor-pointer">
            Mode Admin {adminMode && '(Invisible)'}
          </Label>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un dossier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-2">
          {filteredFolders.length} dossier{filteredFolders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Indicateur du mode admin actif */}
      {adminMode && (session?.user as ExtendedUser)?.role === 'admin' && (
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              Mode Admin activé - Vous voyez tous les dossiers de manière invisible
            </span>
          </div>
        </div>
      )}

      {/* Liste des dossiers */}
      {filteredFolders.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-6 bg-muted/30 rounded-full flex items-center justify-center">
              <Folder className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Aucun dossier trouvé
            </h3>
            <p className="text-muted-foreground mb-6">
              Essayez de modifier votre recherche ou créez un nouveau dossier.
            </p>
            {hasPermission('createFolders') && (
              <Button onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
                <PlusCircle className="w-4 h-4 mr-2" />
                Créer un dossier
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFolders.map(folder => {
            const isOwner = folder.ownerId === session?.user?.id;
            return (
              <Card
                key={folder._id}
                className="group hover:shadow-lg transition-all p-0 overflow-hidden flex flex-col cursor-pointer"
                onClick={() => navigateToFolder(folder._id)}
              >
                {/* Image de couverture */}
                <div className="relative w-full aspect-[16/10] bg-muted/30">
                  {folder.coverImage ? (
                    <Image
                      src={folder.coverImage}
                      alt={folder.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      priority={false}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Folder className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  {/* Tag PARTAGÉ si ce n'est pas le dossier du user */}
                  {!isOwner && (
                    <Badge className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 text-xs rounded shadow">
                      PARTAGÉ
                    </Badge>
                  )}
                  {/* Actions du propriétaire */}
                  {isOwner && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 cursor-pointer w-8 h-8 bg-black/50 hover:bg-black/70 text-white p-0"
                        onClick={e => { e.stopPropagation(); handleManageMembers(e, folder); }}
                        title="Gérer les membres"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 cursor-pointer w-8 h-8 bg-black/50 hover:bg-black/70 text-white p-0"
                        onClick={e => { e.stopPropagation(); handleShare(e, folder); }}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <FolderActions
                        folder={folder}
                        isOwner={isOwner}
                        onEdit={() => { setEditingFolder(folder); }}
                        onDelete={async () => {
                          try {
                            const response = await fetch(`/api/folders?id=${folder._id}`, {
                              method: 'DELETE',
                            });
                            if (!response.ok) throw new Error('Erreur suppression');
                            setFolders(prev => prev.filter(f => f._id !== folder._id));
                            toast.success("Dossier supprimé avec succès");
                          } catch (error) {
                            console.error("Erreur suppression:", error);
                            toast.error("Erreur lors de la suppression du dossier");
                          }
                        }}
                      />
                    </div>
                  )}
                  {folder.accessKey && (
                    <div className="absolute bottom-2 left-2 bg-black/50 p-1 rounded-full">
                      <Lock className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                {/* Contenu */}
                <CardContent className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback>
                        {folder.creator?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {folder.creator?.name}
                    </span>
                  </div>
                  <h3 className="font-semibold truncate text-base">{folder.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{folder.description}</p>
                  {folder.members && folder.members.length > 1 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{folder.members.length} membres</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground border-t px-4 h-9 py-6 flex justify-between items-center mt-auto">
                  <span>
                    {folder.reportsCount ?? 0} rapport{(folder.reportsCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(folder.lastModified ?? folder.createdAt).toLocaleDateString()}
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <CreateFolderDialog 
        open={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)}
        onFolderCreated={handleFolderCreated}
      />

      <JoinFolderDialog
        open={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onJoined={handleFolderJoined}
      />

      {editingFolder && (
        <EditFolderDialog
          folder={editingFolder}
          open={!!editingFolder}
          onClose={() => setEditingFolder(null)}
          onSave={async (data) => {
            // CORRECTION: Utiliser refreshFolders au lieu de fetchFolders
            if (editingFolder.ownerId !== (session?.user as ExtendedUser)?.id) {
              toast.error("Vous n'êtes pas autorisé à modifier ce dossier");
              setEditingFolder(null);
              return;
            }

            try {
              const response = await fetch(`/api/folders?id=${editingFolder._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });

              const result = await response.json();
              
              if (!response.ok) {
                throw new Error(result.error || 'Erreur lors de la modification');
              }
              
              setFolders(prev => prev.map(f => 
                f._id === editingFolder._id ? result : f
              ));
              setEditingFolder(null);
              toast.success('Dossier modifié avec succès');
            } catch (error) {
              console.error("Erreur modification:", error);
              toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification');
            }
          }}
        />
      )}

      {sharingFolder && (
        <ShareFolderDialog
          folder={sharingFolder}
          open={!!sharingFolder}
          onClose={() => setSharingFolder(null)}
          onKeyGenerated={(newKey) => {
            setFolders(prev => prev.map(f => 
              f._id === sharingFolder._id ? { ...f, accessKey: newKey } : f
            ));
          }}
        />
      )}

      {managingMembersFolder && (
        <ManageMembersDialog
          folder={managingMembersFolder}
          open={!!managingMembersFolder}
          onClose={() => setManagingMembersFolder(null)}
          onMembersUpdated={handleMembersUpdated}
        />
      )}
    </div>
  );
}