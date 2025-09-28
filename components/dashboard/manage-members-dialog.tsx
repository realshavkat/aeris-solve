"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { Users, UserMinus, Crown, Calendar } from "lucide-react";
import { toast } from "sonner";
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
import { useSession } from "next-auth/react";

interface Member {
  id: string;
  name: string;
  joinedAt?: string;
  isOwner?: boolean;
}

interface Folder {
  _id: string;
  title: string;
  ownerId: string;
  members?: Member[];
}

interface ManageMembersDialogProps {
  folder: Folder;
  open: boolean;
  onClose: () => void;
  onMembersUpdated: (updatedFolder: Folder) => void;
}

export function ManageMembersDialog({ folder, open, onClose, onMembersUpdated }: ManageMembersDialogProps) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (open && folder) {
      fetchMembers();
    }
  }, [open, folder]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/folders/${folder._id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Erreur chargement membres:", error);
      toast.error("Erreur lors du chargement des membres");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (member.id === folder.ownerId) {
      toast.error("Impossible de retirer le propriétaire du dossier");
      return;
    }

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/folders/${folder._id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      const updatedFolder = await response.json();
      setMembers(updatedFolder.members || []);
      onMembersUpdated(updatedFolder);
      toast.success(`${member.name} a été retiré du dossier`);
    } catch (error) {
      console.error("Erreur suppression membre:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression du membre");
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  const isOwner = session?.user?.id === folder.ownerId;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Membres du dossier "{folder.title}"
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun membre trouvé</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const memberIsOwner = member.id === folder.ownerId;
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {member.name?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            {memberIsOwner && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                <Crown className="w-3 h-3 mr-1" />
                                Propriétaire
                              </Badge>
                            )}
                          </div>
                          
                          {member.joinedAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3" />
                              Rejoint le {new Date(member.joinedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions - seulement si on est propriétaire et que ce n'est pas le propriétaire */}
                      {isOwner && !memberIsOwner && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMemberToRemove(member)}
                          className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {members.length} membre{members.length !== 1 ? 's' : ''}
            </div>
            <Button onClick={onClose} className="cursor-pointer">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={memberToRemove !== null} onOpenChange={() => !isRemoving && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>{memberToRemove?.name}</strong> du dossier ?
              Cette personne perdra l'accès à tous les rapports de ce dossier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving} className="cursor-pointer">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
              disabled={isRemoving}
            >
              {isRemoving ? "Suppression..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
