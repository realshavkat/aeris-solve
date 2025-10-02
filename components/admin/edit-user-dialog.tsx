"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, User } from "lucide-react";

interface User {
  _id: string;
  discordUsername: string;
  discordId: string;
  rpName?: string;
  anonymousNickname?: string;
  status: string;
  role: string;
  createdAt: string;
  avatar?: string;
}

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const statusOptions = [
  { value: "needs_registration", label: "Inscription requise", color: "bg-gray-500/10 text-gray-700" },
  { value: "pending", label: "En attente", color: "bg-yellow-500/10 text-yellow-700" },
  { value: "approved", label: "Approuvé", color: "bg-green-500/10 text-green-700" },
  { value: "rejected", label: "Refusé", color: "bg-red-500/10 text-red-700" },
  { value: "banned", label: "Banni", color: "bg-red-600/10 text-red-800" },
];

const roleOptions = [
  { value: "visitor", label: "Visiteur", icon: User },
  { value: "member", label: "Membre", icon: User },
  { value: "admin", label: "Administrateur", icon: Shield },
];

export function EditUserDialog({ user, open, onClose, onSaved }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    rpName: "",
    anonymousNickname: "",
    status: "",
    role: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialiser le formulaire quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        rpName: user.rpName || "",
        anonymousNickname: user.anonymousNickname || "",
        status: user.status,
        role: user.role,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Utilisateur modifié avec succès");
        onSaved();
        onClose();
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

  if (!user) return null;

  const selectedStatus = statusOptions.find(s => s.value === formData.status);
  const selectedRole = roleOptions.find(r => r.value === formData.role);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage 
                src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : undefined} 
              />
              <AvatarFallback>
                {user.anonymousNickname?.[0]?.toUpperCase() || user.discordUsername[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold">
                {user.anonymousNickname || user.discordUsername}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {selectedStatus && (
                  <Badge className={selectedStatus.color} variant="outline">
                    {selectedStatus.label}
                  </Badge>
                )}
                {selectedRole && (
                  <Badge className="bg-blue-500/10 text-blue-700" variant="outline">
                    <selectedRole.icon className="w-3 h-3 mr-1" />
                    {selectedRole.label}
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations Discord (lecture seule) */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium text-muted-foreground">Informations Discord</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs">Nom d&apos;utilisateur</Label>
                <p className="font-mono">{user.discordUsername}</p>
              </div>
              <div>
                <Label className="text-xs">ID Discord</Label>
                <p className="font-mono text-xs">{user.discordId}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs">Inscription</Label>
              <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Formulaire d'édition */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rpName">Nom RP</Label>
              <Input
                id="rpName"
                value={formData.rpName}
                onChange={(e) => setFormData({ ...formData, rpName: e.target.value })}
                placeholder="Nom RP de l'utilisateur"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anonymousNickname">Surnom Anonyme</Label>
              <Input
                id="anonymousNickname"
                value={formData.anonymousNickname}
                onChange={(e) => setFormData({ ...formData, anonymousNickname: e.target.value })}
                placeholder="Surnom anonyme de l'utilisateur"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                          {status.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <role.icon className="w-4 h-4" />
                          {role.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
