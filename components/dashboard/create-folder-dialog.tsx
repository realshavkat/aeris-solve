"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, ImageIcon } from "lucide-react";
import { uploadToDiscord } from "@/lib/discord-upload";
import { toast } from "sonner";
import Image from "next/image";
import { useSession } from "next-auth/react";

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onFolderCreated?: (folder: any) => void;
}

export function CreateFolderDialog({ open, onClose, onFolderCreated }: CreateFolderDialogProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("L'image est trop volumineuse (max 8MB)");
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadToDiscord(file);
      setCoverImage(imageUrl);
    } catch (error) {
      console.error("Erreur upload:", error);
      alert("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          coverImage: imageUrl,
          creator: {
            name: session?.user?.name || "Utilisateur",
            discordId: session?.user?.id || ""
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du dossier");
      }

      if (onFolderCreated) {
        onFolderCreated(data);
      }
      onClose();
      toast.success("Dossier créé avec succès");
    } catch (error) {
      console.error("Erreur création dossier:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {
      setImageUrl(undefined);
      onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-xl">Nouveau dossier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2.5">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nom du dossier"
                required
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du dossier"
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
                  {isUploading ? "Envoi..." : "Ajouter une image"}
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

                {imageUrl && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                    <Image
                      src={imageUrl}
                      alt="Aperçu"
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setImageUrl(undefined)}
                    >
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}