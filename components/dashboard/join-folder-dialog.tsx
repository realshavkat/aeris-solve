"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface JoinFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onJoined: (folder: any) => void;
}

export function JoinFolderDialog({ open, onClose, onJoined }: JoinFolderDialogProps) {
  const [accessKey, setAccessKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim()) {
      toast.error("Veuillez entrer une clé d'accès");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/folders/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Afficher des messages d'erreur spécifiques selon le cas
        if (response.status === 400) {
          if (data.error === "Vous ne pouvez pas rejoindre votre propre dossier") {
            toast.error("❌ Vous ne pouvez pas rejoindre votre propre dossier", {
              description: "Utilisez plutôt l'onglet 'Mes dossiers' pour accéder à vos dossiers.",
              duration: 4000,
            });
          } else if (data.error === "Vous êtes déjà membre de ce dossier") {
            toast.error("⚠️ Vous êtes déjà membre de ce dossier", {
              description: "Ce dossier apparaît déjà dans votre liste.",
              duration: 4000,
            });
          } else {
            toast.error(data.error || "Erreur lors de l'accès au dossier");
          }
        } else if (response.status === 404) {
          toast.error("🔑 Clé d'accès invalide", {
            description: "Vérifiez que la clé d'accès est correcte.",
            duration: 4000,
          });
        } else {
          throw new Error(data.error || "Erreur lors de l'accès au dossier");
        }
        return;
      }

      onJoined(data);
      onClose();
      setAccessKey("");
      toast.success("✅ Vous avez rejoint le dossier avec succès", {
        description: `Bienvenue dans le dossier "${data.title}"`,
        duration: 4000,
      });
    } catch (error) {
      console.error("Erreur rejoindre dossier:", error);
      toast.error("Une erreur inattendue s'est produite", {
        description: "Veuillez réessayer plus tard.",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAccessKey("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl mb-6">Rejoindre un dossier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessKey">Clé d'accès</Label>
              <Input
                id="accessKey"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Entrez la clé d'accès"
                required
              />
              <p className="text-xs text-muted-foreground">
                Demandez la clé d'accès au propriétaire du dossier
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? "Vérification..." : "Rejoindre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}