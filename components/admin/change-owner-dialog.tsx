"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Crown, UserX } from "lucide-react";
import { toast } from "sonner";

interface User {
  _id: string;
  discordUsername: string;
  discordId: string;
  anonymousNickname?: string;
  avatar?: string;
  status: string;
  role: string;
}

interface ChangeOwnerDialogProps {
  folder: {
    _id: string;
    title: string;
    ownerId: string;
  };
  open: boolean;
  onClose: () => void;
  onOwnerChanged: () => void;
}

export function ChangeOwnerDialog({ folder, open, onClose, onOwnerChanged }: ChangeOwnerDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users.filter(user => user._id !== folder.ownerId));
    } else {
      setFilteredUsers(
        users.filter(user => 
          user._id !== folder.ownerId &&
          (user.discordUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.anonymousNickname?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      );
    }
  }, [searchQuery, users, folder.ownerId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        // Filtrer seulement les utilisateurs approuvés
        const approvedUsers = data.filter((user: User) => user.status === 'approved');
        setUsers(approvedUsers);
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

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error('Veuillez sélectionner un utilisateur');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/folders/${folder._id}/change-owner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: selectedUser }),
      });

      if (response.ok) {
        toast.success('Propriétaire du dossier modifié avec succès');
        onOwnerChanged();
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du changement de propriétaire');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du changement de propriétaire');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedUser("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            Changer le propriétaire de "{folder.title}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recherche */}
          <div className="space-y-2">
            <Label>Rechercher un utilisateur</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom d'utilisateur ou surnom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Liste des utilisateurs */}
          <div className="space-y-2">
            <Label>Sélectionner le nouveau propriétaire</Label>
            <ScrollArea className="h-[300px] border rounded-md p-4">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUser === user._id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedUser(user._id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined} />
                          <AvatarFallback>
                            {user.anonymousNickname?.[0]?.toUpperCase() || user.discordUsername[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="font-medium">
                            {user.anonymousNickname || user.discordUsername}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Discord: {user.discordUsername}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            Rôle: {user.role}
                          </div>
                        </div>

                        {selectedUser === user._id && (
                          <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedUser && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Crown className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Attention : Changement de propriétaire
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Cette action transférera la propriété complète du dossier à l'utilisateur sélectionné. 
                    Vous perdrez vos droits de propriétaire sur ce dossier.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="cursor-pointer">
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedUser || isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? "Changement..." : "Changer le propriétaire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
