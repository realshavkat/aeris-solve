"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ShareFolderDialogProps {
  folder: {
    _id: string;
    title: string;
    accessKey?: string;
  };
  open: boolean;
  onClose: () => void;
  onKeyGenerated: (newKey: string) => void;
}

export function ShareFolderDialog({ folder, open, onClose, onKeyGenerated }: ShareFolderDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [accessKey, setAccessKey] = useState(folder.accessKey || "");
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);

  const generateAccessKey = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleGenerateKey = async (isRegenerate = false) => {
    setIsGenerating(true);
    const newKey = generateAccessKey();

    try {
      const response = await fetch(`/api/folders/access-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          folderId: folder._id, 
          accessKey: newKey,
          regenerate: isRegenerate
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la génération de la clé');
      }

      setAccessKey(newKey);
      onKeyGenerated(newKey);
      
      if (isRegenerate) {
        toast.success("Nouvelle clé d'accès générée. L'ancienne clé n'est plus valide.");
      } else {
        toast.success("Clé d'accès générée avec succès");
      }
    } catch (error) {
      console.error("Erreur génération clé:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la génération de la clé");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = () => {
    if (accessKey) {
      navigator.clipboard.writeText(accessKey)
        .then(() => {
          setShowCopiedTooltip(true);
          setTimeout(() => setShowCopiedTooltip(false), 2000);
        })
        .catch(() => {
          toast.error("Erreur lors de la copie");
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-xl">Partager le dossier &quot;{folder.title}&quot;</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-medium">Clé d&apos;accès</Label>
            {accessKey ? (
              <div className="flex gap-2">
                <Input
                  value={accessKey}
                  readOnly
                  className="font-mono"
                />
                <div className="relative">
                  <Button
                    onClick={handleCopyKey}
                    variant="outline"
                    size="icon"
                    className="cursor-pointer shrink-0 relative"
                  >
                    {showCopiedTooltip ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* Tooltip animée */}
                  <div
                    className={`absolute -top-10 left-1/2 w-15 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg transition-all duration-300 ${
                      showCopiedTooltip 
                        ? 'opacity-100 translate-y-0 scale-100' 
                        : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                    }`}
                  >
                    Copié !
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-green-600"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground mb-4">Aucune clé d&apos;accès générée</p>
                <Button
                  onClick={() => handleGenerateKey(false)}
                  disabled={isGenerating}
                  className="cursor-pointer"
                >
                  {isGenerating ? "Génération..." : "Générer une clé d'accès"}
                </Button>
              </div>
            )}
          </div>

          {accessKey && (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Instructions de partage</h4>
                <p className="text-sm text-muted-foreground">
                  Partagez cette clé d&apos;accès avec les personnes que vous souhaitez inviter. 
                  Elles pourront rejoindre le dossier en utilisant le bouton &quot;Rejoindre un dossier&quot;
                  sur la page principale.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => handleGenerateKey(true)}
                  variant="outline"
                  disabled={isGenerating}
                  className="cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isGenerating ? "Génération..." : "Régénérer la clé"}
                </Button>
                <Button onClick={onClose} className="cursor-pointer">
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
