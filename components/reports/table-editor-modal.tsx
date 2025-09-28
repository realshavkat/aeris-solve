"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TableEditor } from "./table-editor";
import { useState } from "react";
import { Check, X } from "lucide-react";

interface TableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (markdownTable: string) => void;
  initialData?: string;
}

export function TableEditorModal({ 
  isOpen, 
  onClose, 
  onInsertTable, 
  initialData 
}: TableEditorModalProps) {
  const [currentTable, setCurrentTable] = useState<string>("");

  const handleTableUpdate = (markdownTable: string) => {
    setCurrentTable(markdownTable);
  };

  const handleInsert = () => {
    onInsertTable(currentTable);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {initialData ? "Modifier le tableau" : "Créer un nouveau tableau"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <TableEditor 
            onTableUpdate={handleTableUpdate}
            initialData={initialData}
          />
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Annuler
          </Button>
          <Button 
            onClick={handleInsert}
            className="flex items-center gap-2"
            disabled={!currentTable.trim()}
          >
            <Check className="w-4 h-4" />
            {initialData ? "Mettre à jour" : "Insérer le tableau"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
