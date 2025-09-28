"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

interface EditFolderDialogProps {
  folder: {
    _id: string;
    title: string;
    description: string;
    coverImage?: string;
  };
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function EditFolderDialog({ folder, open, onClose, onSave }: EditFolderDialogProps) {
  const [title, setTitle] = useState(folder.title);
  const [description, setDescription] = useState(folder.description);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(folder.coverImage); // null signifie que l'image a été explicitement supprimée

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
        coverImage: imageUrl === undefined ? folder.coverImage : imageUrl, // Garde l'ancienne image si non modifiée
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {
      setImageUrl(undefined); // Réinitialise l'état de l'image
      setTitle(folder.title);
      setDescription(folder.description);
      onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le dossier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
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
                      onClick={() => setImageUrl(null)} // Marque l'image comme explicitement supprimée
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
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