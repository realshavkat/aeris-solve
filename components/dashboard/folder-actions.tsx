"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";

interface FolderActionsProps {
  folder: {
    _id: string;
    title: string;
    ownerId?: string;
  };
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function FolderActions({ folder, isOwner, onEdit, onDelete }: FolderActionsProps) {
  const { hasPermission } = usePermissions(); // Plus de loading
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Vérifier les permissions
  const canEdit = isOwner ? hasPermission('editOwnFolders') : hasPermission('editAllFolders');
  const canDelete = isOwner ? hasPermission('deleteOwnFolders') : hasPermission('deleteAllFolders');

  // Ne pas afficher le menu si aucune action n'est disponible
  if (!canEdit && !canDelete) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 cursor-pointer w-8 h-8 bg-black/50 hover:bg-black/70 text-white p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {canEdit && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
        )}
        {canEdit && canDelete && <DropdownMenuSeparator />}
        {canDelete && (
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
            className="text-destructive cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={e => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le dossier &quot;{folder.title}&quot; ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
}