"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Crown, 
  UserX, 
  Calendar,
  Settings
} from "lucide-react";
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
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface Member {
  id: string;
  name: string;
  image?: string;
  joinedAt?: string;
}

interface FolderMembersDialogProps {
  folder: {
    _id: string;
    title: string;
    ownerId: string;
  };
  open: boolean;
  onClose: () => void;
  onMemberRemoved: () => void;
}

export function FolderMembersDialog({ folder, open, onClose, onMemberRemoved }: FolderMembersDialogProps) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);  
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Vérifier si l'utilisateur est propriétaire ou admin
  const isOwner = folder.ownerId === session?.user?.id;
  const isAdmin = session?.user && 'role' in session.user && session.user.role === "admin";
  const canManageMembers = isOwner || isAdmin;

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  });

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/folders/${folder._id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        throw new Error('Erreur chargement membres');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!canManageMembers) {
      toast.error("Vous n'avez pas les permissions pour retirer des membres");
      return;
    }

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/folders/${folder._id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        toast.success("Membre retiré du dossier");
        onMemberRemoved();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du membre');
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Membres du dossier &quot;{folder.title}&quot;
              {isAdmin && !isOwner && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <Settings className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun membre dans ce dossier</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {members.map((member) => {
                    const isMemberOwner = member.id === folder.ownerId;
                    const canRemove = canManageMembers && !isMemberOwner && member.id !== session?.user?.id;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.image || undefined} />
                            <AvatarFallback>
                              {member.name[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.name}</span>
                              {isMemberOwner && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Propriétaire
                                </Badge>
                              )}
                              {member.id === session?.user?.id && (
                                <Badge variant="outline" className="text-blue-600 border-blue-200">
                                  Vous
                                </Badge>
                              )}
                            </div>
                            {member.joinedAt && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                Rejoint le {new Date(member.joinedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMemberToRemove(member)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {members.length} membre{members.length !== 1 ? 's' : ''} au total
                {isAdmin && !isOwner && (
                  <span className="text-orange-600 ml-2">(Mode Administrateur)</span>
                )}
              </div>
              <Button onClick={onClose} className="cursor-pointer">
                Fermer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => !isRemoving && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>{memberToRemove?.name}</strong> du dossier ?
              Cette personne perdra l&apos;accès à tous les rapports de ce dossier et devra utiliser 
              une nouvelle clé d&apos;accès pour y revenir.
              {isAdmin && !isOwner && (
                <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded border-l-4 border-orange-500 text-sm">
                  <strong>Action d&apos;administrateur :</strong> Vous retirez un membre d&apos;un dossier dont vous n&apos;êtes pas propriétaire.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving} className="cursor-pointer">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove.id)}
              disabled={isRemoving}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
            >
              {isRemoving ? "Suppression..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
