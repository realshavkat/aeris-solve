"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon, Settings } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface EditFolderAdminDialogProps {
  folder: {
    _id: string;
    title: string;
    description: string;
    coverImage?: string;
    ownerId: string;
    creator?: {
      name: string;
      discordId: string;
    };
  };
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function EditFolderAdminDialog({ folder, open, onClose, onSave }: EditFolderAdminDialogProps) {
  const [title, setTitle] = useState(folder.title);
  const [description, setDescription] = useState(folder.description);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(folder.coverImage);

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop lourde. Maximum 5MB.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('https://canary.discord.com/api/webhooks/1420888439116533812/r4--yUIo_aITGMWSg8lLINz_k-vz___cMc5NMT8Osg-jduCKAvFAiVAbWCMkdUvmqXDF', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.attachments?.[0]?.url) {
        setImageUrl(data.attachments[0].url);
        toast.success("Image téléchargée avec succès");
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        title,
        description,
        coverImage: imageUrl === undefined ? folder.coverImage : imageUrl,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setImageUrl(undefined);
    setTitle(folder.title);
    setDescription(folder.description);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-600" />
            Modifier le dossier (Admin)
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Admin
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Informations du propriétaire */}
            <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
              <div className="text-sm">
                <span className="font-medium">Propriétaire :</span>{' '}
                {folder.creator?.name || 'Propriétaire inconnu'}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Image de couverture</Label>
              <div className="flex flex-col gap-4">
                <Button
                  type="button"
                  onClick={() => document.getElementById('imageInput')?.click()}
                  disabled={isUploading}
                  variant="outline"
                  className="cursor-pointer w-full"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {isUploading ? "Envoi..." : "Changer l'image"}
                </Button>
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
                {(imageUrl === undefined ? folder.coverImage : imageUrl) && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                    <Image
                      src={imageUrl === undefined ? folder.coverImage! : imageUrl!}
                      alt="Aperçu"
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setImageUrl(null)}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="cursor-pointer">
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
