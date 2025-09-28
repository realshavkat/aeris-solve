"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  GripHorizontal,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Settings,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Type,
  Palette,
  RotateCcw
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CellStyle {
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

interface TableEditorProps {
  onTableUpdate: (markdownTable: string) => void;
  initialData?: string;
}

export function TableEditor({ onTableUpdate, initialData }: TableEditorProps) {
  const [tableData, setTableData] = useState<string[][]>(() => {
    if (initialData && initialData.trim()) {
      try {
        // Parser le markdown existant de manière plus robuste
        const lines = initialData.trim().split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('|') && line.endsWith('|'));
        
        // Filtrer les séparateurs (lignes avec des tirets)
        const contentLines = lines.filter(line => !line.match(/^\|[\s\-:]+\|$/));
        
        if (contentLines.length > 0) {
          return contentLines.map(line => 
            line.slice(1, -1).split('|').map(cell => cell.trim())
          );
        }
      } catch (error) {
        console.error("Erreur lors du parsing du tableau:", error);
      }
    }
    
    // Tableau par défaut
    return [
      ['En-tête 1', 'En-tête 2', 'En-tête 3'],
      ['Cellule 1', 'Cellule 2', 'Cellule 3'],
      ['Cellule 4', 'Cellule 5', 'Cellule 6']
    ];
  });

  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [cellStyles, setCellStyles] = useState<{[key: string]: CellStyle}>({});
  const [selectedCells, setSelectedCells] = useState<{row: number, col: number}[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{row: number, col: number} | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Génerer le markdown à partir des données du tableau
  const generateMarkdown = () => {
    if (tableData.length === 0) return '';
    
    let markdown = '\n';
    
    // En-tête avec alignement
    markdown += '| ' + tableData[0].join(' | ') + ' |\n';
    
    // Séparateur avec alignement
    const separators = tableData[0].map((_, colIndex) => {
      const headerStyle = cellStyles[`0-${colIndex}`];
      if (headerStyle?.align === 'center') return ':--------:';
      if (headerStyle?.align === 'right') return '--------:';
      return '--------';
    });
    markdown += '|' + separators.map(s => s + '|').join('') + '\n';
    
    // Corps avec formatting
    for (let i = 1; i < tableData.length; i++) {
      const formattedCells = tableData[i].map((cell, colIndex) => {
        const style = cellStyles[`${i}-${colIndex}`];
        let formattedCell = cell;
        
        if (style?.bold) formattedCell = `**${formattedCell}**`;
        if (style?.italic) formattedCell = `*${formattedCell}*`;
        
        return formattedCell;
      });
      
      markdown += '| ' + formattedCells.join(' | ') + ' |\n';
    }
    
    return markdown;
  };

  // Mettre à jour le contenu d'une cellule
  const updateCell = (row: number, col: number, value: string) => {
    const newData = [...tableData];
    newData[row][col] = value;
    setTableData(newData);
  };

  // Ajouter une ligne
  const addRow = (afterIndex?: number) => {
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : tableData.length;
    const newRow = new Array(tableData[0]?.length || 3).fill('');
    const newData = [...tableData];
    newData.splice(insertIndex, 0, newRow);
    setTableData(newData);
  };

  // Ajouter une colonne
  const addColumn = (afterIndex?: number) => {
    const insertIndex = afterIndex !== undefined ? afterIndex + 1 : (tableData[0]?.length || 0);
    const newData = tableData.map(row => {
      const newRow = [...row];
      newRow.splice(insertIndex, 0, '');
      return newRow;
    });
    setTableData(newData);
  };

  // Supprimer une ligne
  const deleteRow = (index: number) => {
    if (tableData.length <= 1) return;
    const newData = tableData.filter((_, i) => i !== index);
    setTableData(newData);
  };

  // Supprimer une colonne
  const deleteColumn = (index: number) => {
    if (tableData[0]?.length <= 1) return;
    const newData = tableData.map(row => row.filter((_, i) => i !== index));
    setTableData(newData);
  };

  // Appliquer un style à une cellule
  const applyCellStyle = (row: number, col: number, style: Partial<CellStyle>) => {
    const key = `${row}-${col}`;
    setCellStyles(prev => ({
      ...prev,
      [key]: { ...prev[key], ...style }
    }));
  };

  const applyToSelectedCells = (style: Partial<CellStyle>) => {
    if (selectedCells.length === 0 && selectedCell) {
      applyCellStyle(selectedCell.row, selectedCell.col, style);
    } else {
      selectedCells.forEach(cell => {
        applyCellStyle(cell.row, cell.col, style);
      });
    }
  };

  // Gestion des cellules sélectionnées
  const handleCellMouseDown = (row: number, col: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      // Sélectionner une plage de cellules
      const minRow = Math.min(selectedCell.row, row);
      const maxRow = Math.max(selectedCell.row, row);
      const minCol = Math.min(selectedCell.col, col);
      const maxCol = Math.max(selectedCell.col, col);
      
      const range = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          range.push({ row: r, col: c });
        }
      }
      setSelectedCells(range);
    } else {
      setSelectedCell({ row, col });
      setSelectedCells([]);
      setDragStart({ row, col });
      setIsDragging(true);
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isDragging && dragStart) {
      const minRow = Math.min(dragStart.row, row);
      const maxRow = Math.max(dragStart.row, row);
      const minCol = Math.min(dragStart.col, col);
      const maxCol = Math.max(dragStart.col, col);
      
      const range = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          range.push({ row: r, col: c });
        }
      }
      setSelectedCells(range);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const isCellSelected = (row: number, col: number) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col) ||
           (selectedCell?.row === row && selectedCell?.col === col);
  };

  // Mettre à jour le markdown quand les données ou les styles changent
  useEffect(() => {
    onTableUpdate(generateMarkdown());
  }, [tableData, cellStyles]);

  return (
    <div className="p-4 border border-border rounded-lg bg-card my-4">
      {/* Enhanced toolbar */}
      <div className="mb-4 space-y-3">
        {/* Primary actions */}
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => addRow()}
                  className="cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Ligne
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajouter une nouvelle ligne</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => addColumn()}
                  className="cursor-pointer"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Colonne
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ajouter une nouvelle colonne</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Formatting toolbar */}
        <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={selectedCells.some(cell => cellStyles[`${cell.row}-${cell.col}`]?.bold) ? "default" : "outline"}
              onClick={() => applyToSelectedCells({ bold: !cellStyles[`${selectedCell?.row || 0}-${selectedCell?.col || 0}`]?.bold })}
              disabled={!selectedCell && selectedCells.length === 0}
              className="cursor-pointer"
            >
              <Bold className="w-3 h-3" />
            </Button>
            
            <Button
              size="sm"
              variant={selectedCells.some(cell => cellStyles[`${cell.row}-${cell.col}`]?.italic) ? "default" : "outline"}
              onClick={() => applyToSelectedCells({ italic: !cellStyles[`${selectedCell?.row || 0}-${selectedCell?.col || 0}`]?.italic })}
              disabled={!selectedCell && selectedCells.length === 0}
              className="cursor-pointer"
            >
              <Italic className="w-3 h-3" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyToSelectedCells({ align: 'left' })}
              disabled={!selectedCell && selectedCells.length === 0}
              className="cursor-pointer"
            >
              <AlignLeft className="w-3 h-3" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyToSelectedCells({ align: 'center' })}
              disabled={!selectedCell && selectedCells.length === 0}
              className="cursor-pointer"
            >
              <AlignCenter className="w-3 h-3" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyToSelectedCells({ align: 'right' })}
              disabled={!selectedCell && selectedCells.length === 0}
              className="cursor-pointer"
            >
              <AlignRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCellStyles({});
              setSelectedCells([]);
              setSelectedCell(null);
            }}
            className="cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border shadow-sm">
        {/* Table header controls - improved layout */}
        <div className="absolute top-0 left-8 right-0 flex">
          {tableData[0]?.map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="flex-1 flex justify-center"
              onMouseEnter={() => setHoveredCol(colIndex)}
              onMouseLeave={() => setHoveredCol(null)}
            >
              {hoveredCol === colIndex && (
                <div className="absolute top-0 flex gap-1 bg-accent/70 backdrop-blur-sm rounded-b-md shadow-md px-1 py-0.5 z-10">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => addColumn(colIndex)}
                    className="h-6 w-6 p-0 cursor-pointer hover:bg-primary/20"
                    title="Ajouter colonne après"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  {tableData[0].length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteColumn(colIndex)}
                      className="h-6 w-6 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/20"
                      title="Supprimer colonne"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (colIndex > 0) {
                        // Move column left
                        const newData = tableData.map(row => {
                          const newRow = [...row];
                          const temp = newRow[colIndex];
                          newRow[colIndex] = newRow[colIndex - 1];
                          newRow[colIndex - 1] = temp;
                          return newRow;
                        });
                        setTableData(newData);
                      }
                    }}
                    disabled={colIndex === 0}
                    className="h-6 w-6 p-0 cursor-pointer disabled:opacity-50"
                    title="Déplacer à gauche"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (colIndex < tableData[0].length - 1) {
                        // Move column right
                        const newData = tableData.map(row => {
                          const newRow = [...row];
                          const temp = newRow[colIndex];
                          newRow[colIndex] = newRow[colIndex + 1];
                          newRow[colIndex + 1] = temp;
                          return newRow;
                        });
                        setTableData(newData);
                      }
                    }}
                    disabled={colIndex === tableData[0].length - 1}
                    className="h-6 w-6 p-0 cursor-pointer disabled:opacity-50"
                    title="Déplacer à droite"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <div className="h-2 w-full"></div>
            </div>
          ))}
        </div>

        {/* Row controls - improved layout */}
        <div className="absolute top-0 left-0 bottom-0 w-8">
          {tableData.map((_, rowIndex) => (
            <div 
              key={rowIndex}
              className="flex items-center justify-center h-12 relative"
              onMouseEnter={() => setHoveredRow(rowIndex)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {hoveredRow === rowIndex && (
                <div className="absolute left-0 flex flex-col gap-1 bg-accent/70 backdrop-blur-sm rounded-r-md shadow-md px-0.5 py-1 z-10">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => addRow(rowIndex)}
                    className="h-6 w-6 p-0 cursor-pointer hover:bg-primary/20"
                    title="Ajouter ligne après"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  {tableData.length > 2 && rowIndex !== 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteRow(rowIndex)}
                      className="h-6 w-6 p-0 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/20"
                      title="Supprimer ligne"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (rowIndex > 0) {
                        // Move row up
                        const newData = [...tableData];
                        const temp = newData[rowIndex];
                        newData[rowIndex] = newData[rowIndex - 1];
                        newData[rowIndex - 1] = temp;
                        setTableData(newData);
                      }
                    }}
                    disabled={rowIndex === 0}
                    className="h-6 w-6 p-0 cursor-pointer disabled:opacity-50"
                    title="Déplacer vers le haut"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (rowIndex < tableData.length - 1) {
                        // Move row down
                        const newData = [...tableData];
                        const temp = newData[rowIndex];
                        newData[rowIndex] = newData[rowIndex + 1];
                        newData[rowIndex + 1] = temp;
                        setTableData(newData);
                      }
                    }}
                    disabled={rowIndex === tableData.length - 1}
                    className="h-6 w-6 p-0 cursor-pointer disabled:opacity-50"
                    title="Déplacer vers le bas"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <div className="w-2 h-full"></div>
            </div>
          ))}
        </div>

        <div className="ml-8 overflow-x-auto">
          <table ref={tableRef} className="w-full border-collapse bg-card">
            <thead className="bg-muted/50">
              <tr>
                {tableData[0]?.map((cell, colIndex) => {
                  const style = cellStyles[`0-${colIndex}`] || {};
                  return (
                    <th 
                      key={colIndex} 
                      className={`border-r border-border last:border-r-0 p-0 ${
                        isCellSelected(0, colIndex) ? 'ring-2 ring-primary ring-inset' : ''
                      }`}
                      style={{
                        textAlign: style.align || 'center',
                        backgroundColor: style.backgroundColor,
                        color: style.textColor
                      }}
                      onMouseDown={(e) => handleCellMouseDown(0, colIndex, e)}
                      onMouseEnter={() => handleCellMouseEnter(0, colIndex)}
                    >
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(0, colIndex, e.target.value)}
                        className={`w-full px-4 py-3 bg-transparent border-0 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset text-center ${
                          style.bold ? 'font-bold' : ''
                        } ${style.italic ? 'italic' : ''}`}
                        placeholder="En-tête"
                        style={{ textAlign: style.align || 'center' }}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border">
              {tableData.slice(1).map((row, rowIndex) => {
                const actualRowIndex = rowIndex + 1;
                return (
                  <tr 
                    key={actualRowIndex}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {row.map((cell, colIndex) => {
                      const style = cellStyles[`${actualRowIndex}-${colIndex}`] || {};
                      const bgClass = actualRowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/5';
                      return (
                        <td 
                          key={colIndex} 
                          className={`border-r border-border last:border-r-0 p-0 ${bgClass} ${
                            isCellSelected(actualRowIndex, colIndex) ? 'ring-2 ring-primary ring-inset' : ''
                          }`}
                          style={{
                            backgroundColor: style.backgroundColor || undefined,
                            color: style.textColor
                          }}
                          onMouseDown={(e) => handleCellMouseDown(actualRowIndex, colIndex, e)}
                          onMouseEnter={() => handleCellMouseEnter(actualRowIndex, colIndex)}
                        >
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => updateCell(actualRowIndex, colIndex, e.target.value)}
                            onFocus={() => setSelectedCell({row: actualRowIndex, col: colIndex})}
                            className={`w-full px-4 py-3 bg-transparent border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${
                              style.bold ? 'font-bold' : ''
                            } ${style.italic ? 'italic' : ''}`}
                            placeholder="Cellule"
                            style={{ textAlign: style.align || 'left' }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced status bar */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4" />
            <span>{tableData[0]?.length || 0} colonnes</span>
          </div>
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            <span>{tableData.length} lignes</span>
          </div>
          {selectedCells.length > 0 && (
            <div className="px-2 py-1 bg-primary/10 rounded text-primary">
              {selectedCells.length} cellules sélectionnées
            </div>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="cursor-pointer">
              <Settings className="w-3 h-3 mr-1" />
              Options avancées
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => {
                setTableData([
                  ['En-tête 1', 'En-tête 2', 'En-tête 3'],
                  ['Cellule 1', 'Cellule 2', 'Cellule 3'],
                  ['Cellule 4', 'Cellule 5', 'Cellule 6']
                ]);
                setCellStyles({});
              }}
              className="cursor-pointer"
            >
              Réinitialiser le tableau
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(generateMarkdown());
              }}
              className="cursor-pointer"
            >
              Copier le code Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Aperçu markdown - improved styling */}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center">
          <span>Voir le code Markdown généré</span>
        </summary>
        <div className="mt-2 p-3 bg-muted rounded-lg overflow-hidden">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {generateMarkdown()}
          </pre>
        </div>
      </details>
    </div>
  );
}
