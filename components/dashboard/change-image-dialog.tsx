"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ChangeImageDialogProps {
  folderId: string;
  open: boolean;
  onClose: () => void;
  onImageChanged: (newImageUrl: string) => void;
}

export function ChangeImageDialog({ folderId, open, onClose, onImageChanged }: ChangeImageDialogProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB max
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
      if (!data.attachments?.[0]?.url) {
        throw new Error('URL de l\'image non trouvée');
      }

      // Mettre à jour le dossier avec la nouvelle image
      const updateResponse = await fetch(`/api/folders?id=${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImage: data.attachments[0].url }),
      });

      if (!updateResponse.ok) {
        throw new Error('Erreur lors de la mise à jour du dossier');
      }

      const updatedFolder = await updateResponse.json();
      onImageChanged(updatedFolder.coverImage);
      onClose();
      toast.success('Image mise à jour avec succès');
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors du changement d\'image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Changer l'image de couverture</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => document.getElementById('imageInput')?.click()}
                className="cursor-pointer"
                disabled={isUploading}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {isUploading ? 'Envoi...' : 'Choisir une image'}
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
