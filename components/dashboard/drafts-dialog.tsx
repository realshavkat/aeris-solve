"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { FileText, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Draft {
  _id: string;
  title: string;
  content: string;
  importance: string;
  tags: string[];
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface DraftsDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectDraft: (draft: Draft) => void;
  folderId: string;
}

const importanceOptions = [
  { value: 'low', label: 'Faible', color: 'bg-green-500/10 text-green-700 border-green-200', icon: '🟢' },
  { value: 'medium', label: 'Moyen', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200', icon: '🟡' },
  { value: 'high', label: 'Élevé', color: 'bg-orange-500/10 text-orange-700 border-orange-200', icon: '🟠' },
  { value: 'critical', label: 'Critique', color: 'bg-red-500/10 text-red-700 border-red-200', icon: '🔴' }
];

export function DraftsDialog({ open, onClose, onSelectDraft, folderId }: DraftsDialogProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && folderId) {
      fetchDrafts();
    }
  });

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/drafts?folderId=${folderId}`);
      if (response.ok) {
        const data = await response.json();
        setDrafts(data);
      } else {
        throw new Error('Erreur chargement brouillons');
      }
    } catch (error) {
      console.error("Erreur chargement brouillons:", error);
      toast.error("Erreur lors du chargement des brouillons");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`/api/drafts?id=${draftId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setDrafts(prev => prev.filter(d => d._id !== draftId));
        toast.success("Brouillon supprimé");
      } else {
        throw new Error('Erreur suppression');
      }
    } catch (error) {
      console.error("Erreur suppression brouillon:", error);
      toast.error("Erreur lors de la suppression du brouillon");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Brouillons sauvegardés
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun brouillon trouvé</p>
              <p className="text-sm">Vos brouillons apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => {
                const importance = importanceOptions.find(opt => opt.value === draft.importance);
                
                return (
                  <div
                    key={draft._id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          onSelectDraft(draft);
                          onClose();
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{draft.icon}</span>
                          <h3 className="font-medium line-clamp-1">
                            {draft.title || 'Brouillon sans titre'}
                          </h3>
                          {importance && (
                            <Badge className={`${importance.color} border text-xs`} variant="outline">
                              {importance.icon}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {draft.content.substring(0, 120)}...
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(draft.updatedAt).toLocaleDateString()}
                          </div>
                          
                          {draft.tags.length > 0 && (
                            <div className="flex gap-1">
                              {draft.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {draft.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{draft.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDraft(draft._id);
                        }}
                        className="opacity-0 group-hover:opacity-100 cursor-pointer text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
