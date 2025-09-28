"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Table, Grid3x3, Edit } from "lucide-react";
import { TableEditorModal } from "./table-editor-modal";

interface TableInsertionTriggerProps {
  onInsertTable: (markdownTable: string) => void;
}

export function TableInsertionTrigger({ onInsertTable }: TableInsertionTriggerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number} | null>(null);

  const generateQuickTable = (rows: number, cols: number) => {
    let markdown = '\n';
    
    // En-tête
    const headers = Array.from({ length: cols }, (_, i) => `Colonne ${i + 1}`);
    markdown += '| ' + headers.join(' | ') + ' |\n';
    
    // Séparateur
    markdown += '|' + Array.from({ length: cols }, () => '-----------|').join('') + '\n';
    
    // Corps
    for (let i = 0; i < rows - 1; i++) {
      const cells = Array.from({ length: cols }, (_, j) => `Cellule ${i + 1}-${j + 1}`);
      markdown += '| ' + cells.join(' | ') + ' |\n';
    }
    
    return markdown;
  };

  const handleQuickInsert = (rows: number, cols: number) => {
    const table = generateQuickTable(rows, cols);
    onInsertTable(table);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Insérer tableau
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel className="text-sm font-medium">
            Insertion rapide
          </DropdownMenuLabel>
          
          {/* Grille de sélection rapide */}
          <div className="p-3">
            <div className="grid grid-cols-8 gap-1 mb-2">
              {Array.from({ length: 64 }, (_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isHovered = hoveredCell && row <= hoveredCell.row && col <= hoveredCell.col;
                
                return (
                  <div
                    key={i}
                    className={`
                      w-4 h-4 border border-border cursor-pointer transition-colors
                      ${isHovered ? 'bg-primary' : 'bg-card hover:bg-muted'}
                    `}
                    onMouseEnter={() => setHoveredCell({ row, col })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleQuickInsert(row + 1, col + 1)}
                  />
                );
              })}
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              {hoveredCell 
                ? `${hoveredCell.row + 1} × ${hoveredCell.col + 1} tableau`
                : 'Survolez pour sélectionner la taille'
              }
            </div>
          </div>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsModalOpen(true)}
            className="cursor-pointer flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Éditeur avancé de tableau
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => handleQuickInsert(3, 3)}
            className="cursor-pointer flex items-center gap-2"
          >
            <Grid3x3 className="w-4 h-4" />
            Tableau 3×3 par défaut
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TableEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInsertTable={onInsertTable}
      />
    </>
  );
}
