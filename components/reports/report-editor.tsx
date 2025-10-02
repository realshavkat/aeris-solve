"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react"; // AJOUT DE L'IMPORT MANQUANT
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Palette,
  Save,
  ArrowLeft,
  Smile,
  Edit3,
  X,
  Check,
  Eye
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { BlockEditor, Block } from "./block-editor";

// Create client-only versions of the popover components
const ClientSidePopover = ({ children, ...props }: { children: React.ReactNode; trigger?: React.ReactNode; [key: string]: unknown }) => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    // Return placeholder with same dimensions but no functionality
    return <div className="inline-block">{props.trigger}</div>;
  }
  
  return <Popover {...props}>{children}</Popover>;
};

// Constantes existantes...
const iconEmojis = [
  '📄', '📋', '📊', '📈', '📉', '📌', '📍', '🔥', '⭐', '💡',
  '🎯', '🚀', '⚡', '🔒', '🔓', '❗', '❓', '💎', '🎉', '🏆'
];

const importanceOptions = [
  { value: 'low', label: 'Faible', color: 'bg-green-500/10 text-green-700 border-green-200', icon: '🟢' },
  { value: 'medium', label: 'Moyen', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200', icon: '🟡' },
  { value: 'high', label: 'Élevé', color: 'bg-orange-500/10 text-orange-700 border-orange-200', icon: '🟠' },
  { value: 'critical', label: 'Critique', color: 'bg-red-500/10 text-red-700 border-red-200', icon: '🔴' }
];

const colorPalette = [
  '#0f172a', '#1e293b', '#334155', '#475569', 
  '#701a75', '#4a044e', '#581c87', '#3b0764', 
  '#312e81', '#1e3a8a', '#164e63', '#134e4a', 
  '#064e3b', '#14532d', '#365314', '#422006', 
  '#7f1d1d', '#991b1b', '#1f2937', '#374151',
  '#4b5563', '#6b7280', '#9ca3af', '#d1d5db',
  '#92400e', '#b45309', '#d97706', '#f59e0b',
  '#eab308', '#ca8a04', '#a3a3a3', '#737373'
];

// Emoji picker amélioré
const EmojiPicker = ({ onEmojiSelect, onOpenChange }: {
  onEmojiSelect: (emoji: string) => void;
  onOpenChange: (open: boolean) => void;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="w-[360px] bg-background border rounded-lg shadow-lg overflow-hidden">
      {/* Simplified emoji grid */}
      <div className="p-4">
        <div className="grid grid-cols-8 gap-2">
          {iconEmojis.map((emoji, index) => (
            <button
              key={index}
              type="button"
              className="h-10 w-10 p-0 hover:bg-accent rounded-md transition-colors text-xl flex items-center justify-center cursor-pointer"
              onClick={() => {
                onEmojiSelect(emoji);
                onOpenChange(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Palette de couleurs améliorée
const ColorPalette = ({ selectedColor, onColorSelect }: {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="w-64 p-4">
      <div className="grid grid-cols-8 gap-2">
        {colorPalette.map((colorOption) => (
          <button
            key={colorOption}
            onClick={() => onColorSelect(colorOption)}
            className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
              selectedColor === colorOption 
                ? 'border-ring shadow-md scale-110' 
                : 'border-transparent hover:border-ring/50'
            }`}
            style={{ backgroundColor: colorOption }}
          >
            {selectedColor === colorOption && (
              <Check className="h-4 w-4 text-white drop-shadow-md mx-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

interface ReportSaveData {
  title: string;
  content: string;
  importance: string;
  tags: string[];
  color: string;
  icon: string;
}

interface ReportEditorProps {
  initialData?: {
    title: string;
    content: string;
    importance: string;
    tags: string[];
    color: string;
    icon: string;
    author?: { name?: string };
  };
  onSave: (data: ReportSaveData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  folderId?: string;
  draftId?: string;
}

const BLOCK_TYPES = ['text','heading','list','table','image','quote','code','divider','checklist','spacer','file'] as const;
type BlockType = typeof BLOCK_TYPES[number];
const isBlockType = (v: string): v is BlockType => (BLOCK_TYPES as readonly string[]).includes(v);

export function ReportEditor({ initialData, onSave, onCancel, isEditing = false, folderId, draftId }: ReportEditorProps) {
  const { data: session } = useSession(); // AJOUT DE LA SESSION
  const [title, setTitle] = useState(initialData?.title || '');
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialData?.content) {
      try {
        // Essayer d'extraire des blocs du contenu markdown
        const blockRegex = /{{block-([a-z]+)-([0-9a-zA-Z_-]+)}}\n([\s\S]*?)\n{{\/block-\1-\2}}/g;
        const matches = Array.from(initialData.content.matchAll(blockRegex));
        
        if (matches.length > 0) {
          return matches.map((m, index): Block => {
            const [, rawType, id, content] = m;
            const type: BlockType = isBlockType(rawType) ? rawType : 'text';
            const processedContent = content.trim();
            
            // Process specific block types
            switch (type) {
              case 'text':
                // NOUVEAU: Extraction des couleurs et alignement
                const metaRegex = /^<!-- data-align:(left|center|right)(?:\s+data-text-color:([^>\s]+))?(?:\s+data-bg-color:([^>\s]+))?\s*-->([\s\S]*)$/;
                const metaMatch = processedContent.match(metaRegex);
                
                if (metaMatch) {
                  return {
                    id,
                    type,
                    content: { 
                      text: metaMatch[4].trim(),
                      alignment: metaMatch[1],
                      textColor: metaMatch[2] || '#000000',
                      backgroundColor: metaMatch[3] || 'transparent'
                    },
                    order: index
                  };
                } else {
                  return {
                    id,
                    type,
                    content: { 
                      text: processedContent,
                      alignment: 'left',
                      textColor: '#000000',
                      backgroundColor: 'transparent'
                    },
                    order: index
                  };
                }

              case 'table':
                try {
                  // Parse table markdown to structured data
                  const lines = processedContent.split('\n').filter(line => line.trim());
                  if (lines.length >= 2) {
                    // Extract headers
                    const headerLine = lines[0].trim();
                    const headers = headerLine
                      .substring(1, headerLine.length - 1)
                      .split('|')
                      .map((h: string) => h.trim());
                    
                    // Extract rows (skip header and separator lines)
                    const dataRows = lines.slice(2);
                    const rows = dataRows.map((row: string) => {
                      const cells = row
                        .substring(1, row.length - 1)
                        .split('|')
                        .map((cell: string) => cell.trim());
                      
                      // Ensure row has the right number of cells
                      while (cells.length < headers.length) cells.push('');
                      return cells;
                    });
                    
                    return {
                      id,
                      type,
                      content: { headers, rows },
                      order: index
                    };
                  }
                } catch (err) {
                  console.error("Error parsing table:", err);
                }
                
                // Default table structure if parsing fails
                return {
                  id, 
                  type, 
                  content: { 
                    headers: ["Column 1", "Column 2"],
                    rows: [["", ""]]
                  }, 
                  order: index 
                };

              case 'code':
                // MODIFICATION: Correction complète du parsing du code
                const codeMatch = processedContent.match(/^```([a-zA-Z0-9_+-]*)\n([\s\S]*)\n```$/);
                if (codeMatch) {
                  const language = codeMatch[1].trim() || 'plaintext';
                  const code = codeMatch[2];
                  return {
                    id, 
                    type, 
                    content: { 
                      language: language === '' ? 'plaintext' : language, 
                      code
                    },
                    order: index
                  };
                }
                // Si ce n'est pas au format markdown, traiter comme du texte brut
                return { 
                  id, 
                  type, 
                  content: { 
                    language: 'plaintext', 
                    code: processedContent
                  }, 
                  order: index 
                };

              case 'image':
                try {
                  // CORRECTION: Parser le nouveau format de données d'image structuré
                  const imageDataMatch = processedContent.match(/{{image-data}}\s*([\s\S]*?)\s*{{\/image-data}}/);
                  if (imageDataMatch) {
                    const imageDataContent = imageDataMatch[1].trim();
                    const lines = imageDataContent.split('\n').map(line => line.trim()).filter(line => line);
                    const imageData: Record<string, string | number | unknown[]> = {};
                    
                    lines.forEach(line => {
                      const colonIndex = line.indexOf(': ');
                      if (colonIndex > 0) {
                        const key = line.substring(0, colonIndex).trim();
                        const value = line.substring(colonIndex + 2).trim();
                        
                        if (key === 'width' || key === 'height') {
                          const numValue = parseInt(value);
                          if (!isNaN(numValue)) {
                            imageData[key] = numValue;
                          }
                        } else if (key === 'additionalImages') {
                          try {
                            imageData[key] = JSON.parse(value);
                          } catch {
                            imageData[key] = [];
                          }
                        } else {
                          imageData[key] = value;
                        }
                      }
                    });

                    // CORRECTION: Vérifier que les données essentielles existent
                    if (imageData.src) {
                      return {
                        id,
                        type,
                        content: {
                          src: imageData.src,
                          alt: imageData.alt || '',
                          caption: imageData.caption || '',
                          wrapText: imageData.wrapText || '',
                          alignment: imageData.alignment || 'center',
                          width: imageData.width || 400,
                          height: imageData.height || 300,
                          additionalImages: Array.isArray(imageData.additionalImages) ? imageData.additionalImages : []
                        },
                        order: index
                      };
                    }
                  }

                  // FALLBACK: Essayer de parser l'ancien format ou format direct
                  if (processedContent.includes('http')) {
                    // Extraire l'URL directement
                    const urlMatch = processedContent.match(/(https?:\/\/[^\s<>]+)/);
                    if (urlMatch) {
                      return {
                        id,
                        type,
                        content: {
                          src: urlMatch[1],
                          alt: 'Image',
                          caption: '',
                          wrapText: '',
                          alignment: 'center',
                          width: 400,
                          height: 300,
                          additionalImages: []
                        },
                        order: index
                      };
                    }
                  }
                } catch (err) {
                  console.error('Erreur parsing image block:', err);
                }
                
                // Si le parsing échoue, retourner un bloc image vide
                return {
                  id,
                  type,
                  content: {
                    src: '',
                    alt: '',
                    caption: '',
                    wrapText: '',
                    alignment: 'center',
                    width: 400,
                    height: 300,
                    additionalImages: []
                  },
                  order: index
                };
 
              // CORRECTION: Parser correctement les citations en retirant le préfixe ">"
              case 'quote':
                let quoteText = processedContent;
                if (quoteText.startsWith('> ')) {
                  quoteText = quoteText.substring(2).trim();
                }
                return {
                  id,
                  type,
                  content: { text: quoteText },
                  order: index
                };

              case 'checklist':
                // CORRECTION: Parser le nouveau format de checklist correctement
                let showProgress = true;
                let checklistContent = processedContent;
                
                // Extraire les métadonnées
                const metaMatch2 = processedContent.match(/^{{checklist-meta:showProgress:(true|false)}}\n([\s\S]*)$/);
                if (metaMatch2) {
                  showProgress = metaMatch2[1] === 'true';
                  checklistContent = metaMatch2[2];
                }
                
                // CORRECTION: Parser les éléments de la checklist correctement
                const checklistLines = checklistContent.split('\n').filter(line => line.trim() && line.includes('['));
                const checklistItems = checklistLines.map(line => {
                  const match = line.match(/^- \[([ x])\] (.*)$/);
                  if (match) {
                    return {
                      checked: match[1] === 'x',
                      text: match[2].trim()
                    };
                  }
                  // Fallback pour les lignes mal formatées
                  return { 
                    checked: false, 
                    text: line.replace(/^- (\[[ x]\] )?/, '').trim() 
                  };
                }).filter(item => item.text.trim() !== ''); // Filtrer les items vides
                
                // CORRECTION: S'assurer qu'il y a au moins un élément non vide
                if (checklistItems.length === 0) {
                  checklistItems.push({ text: '', checked: false });
                }
                
                return {
                  id,
                  type,
                  content: { 
                    checklistItems,
                    showProgress
                  },
                  order: index
                };

              case 'file':
                // CORRECTION: Parser les données de fichier depuis le format sauvegardé
                try {
                  const fileDataMatch = processedContent.match(/{{file-data}}\s*([\s\S]*?)\s*{{\/file-data}}/);
                  if (fileDataMatch) {
                    const fileDataContent = fileDataMatch[1].trim();
                    const lines = fileDataContent.split('\n').map(line => line.trim()).filter(line => line);
                    const fileData: Record<string, string | number> = {};
                    
                    lines.forEach(line => {
                      const colonIndex = line.indexOf(': ');
                      if (colonIndex > 0) {
                        const key = line.substring(0, colonIndex).trim();
                        const value = line.substring(colonIndex + 2).trim();
                        
                        if (key === 'fileSize') {
                          const numValue = parseInt(value);
                          if (!isNaN(numValue)) {
                            fileData[key] = numValue;
                          }
                        } else {
                          fileData[key] = value;
                        }
                      }
                    });

                    // CORRECTION: Vérifier que les données essentielles existent
                    if (fileData.src && fileData.fileName) {
                      return {
                        id,
                        type,
                        content: {
                          src: fileData.src,
                          fileName: fileData.fileName,
                          fileSize: fileData.fileSize || 0,
                          fileType: fileData.fileType || ''
                        },
                        order: index
                      };
                    }
                  }
                  
                  // FALLBACK: Essayer de parser l'ancien format ou format direct
                  if (processedContent.includes('cdn.discordapp.com') || processedContent.includes('http')) {
                    // Extraire l'URL directement
                    const urlMatch = processedContent.match(/(https?:\/\/[^\s]+)/);
                    if (urlMatch) {
                      return {
                        id,
                        type,
                        content: {
                          src: urlMatch[1],
                          fileName: 'Fichier uploadé',
                          fileSize: 0,
                          fileType: 'application/octet-stream'
                        },
                        order: index
                      };
                    }
                  }
                } catch (err) {
                  console.error('Erreur parsing file block:', err);
                }
                
                // Si le parsing échoue, retourner un bloc fichier vide
                return {
                  id,
                  type,
                  content: {
                    src: '',
                    fileName: '',
                    fileSize: 0,
                    fileType: ''
                  },
                  order: index
                };

              case 'spacer':
                // NOUVEAU: Parser les données d'espacement
                const spacerMatch = processedContent.match(/{{spacer:(\d+)}}/);
                if (spacerMatch) {
                  const height = parseInt(spacerMatch[1]) || 40;
                  return {
                    id,
                    type,
                    content: { height },
                    order: index
                  };
                }
                return {
                  id,
                  type,
                  content: { height: 40 },
                  order: index
                };

              case 'divider':
                return {
                  id,
                  type,
                  content: {},
                  order: index
                };

              // ...existing code...
            }

            return {
              id,
              type: 'text',
              content: { text: processedContent, alignment: 'left', textColor: '#000000', backgroundColor: 'transparent' },
              order: index,
            };
          });
        }
      } catch (error) {
        console.error("Erreur de traitement des blocs:", error);
      }
      
      // Si aucun bloc n'a pu être extrait, créer un bloc de texte par défaut
      return [{ 
        id: '1', 
        type: 'text', 
        content: { 
          text: initialData.content,
          alignment: 'left',
          textColor: '#000000',
          backgroundColor: 'transparent'
        }, 
        order: 0 
      }];
    }
    return [];
  });
  const [importance, setImportance] = useState(initialData?.importance || 'medium');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [color, setColor] = useState(initialData?.color || '#1e293b');
  const [icon, setIcon] = useState(initialData?.icon || '📄');
  const [newTag, setNewTag] = useState('');
  
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(
    !initialData || !isEditing ? 'edit' : 'preview'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId || null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Debounce pour l'arrêt d'écriture
  const debouncedTitle = useDebounce(title, 5000);
  const debouncedBlocks = useDebounce(JSON.stringify(blocks), 5000);
  const debouncedImportance = useDebounce(importance, 5000);
  const debouncedTags = useDebounce(JSON.stringify(tags), 5000);
  const debouncedColor = useDebounce(color, 5000);
  const debouncedIcon = useDebounce(icon, 5000);

  const [lastSaveHash, setLastSaveHash] = useState<string>('');

  // Ajouter la définition de selectedImportance
  const selectedImportance = importanceOptions.find(opt => opt.value === importance);

  // Fonction pour générer un hash du contenu (corrigée)
  const generateContentHash = useCallback(() => {
    try {
      const content = JSON.stringify({
        title: debouncedTitle,
        blocks: debouncedBlocks,
        importance: debouncedImportance,
        tags: debouncedTags,
        color: debouncedColor,
        icon: debouncedIcon
      });
      // Utiliser encodeURIComponent au lieu de btoa pour éviter les caractères invalides
      return encodeURIComponent(content);
    } catch (error) {
      console.error('Erreur génération hash:', error);
      return Date.now().toString();
    }
  }, [debouncedTitle, debouncedBlocks, debouncedImportance, debouncedTags, debouncedColor, debouncedIcon]);

  // Détecter les changements
  useEffect(() => {
    if (initialData) {
      const hasChanges = 
        title !== (initialData.title || '') ||
        JSON.stringify(blocks) !== JSON.stringify([{ id: '1', type: 'text', content: initialData.content, order: 0 }]) ||
        importance !== (initialData.importance || 'medium') ||
        JSON.stringify(tags) !== JSON.stringify(initialData.tags || []) ||
        color !== (initialData.color || '#1e293b') ||
        icon !== (initialData.icon || '📄');
      
      setHasUnsavedChanges(hasChanges);
    } else {
      // Nouveau rapport
      const hasContent = title.trim() !== '' || blocks.length > 0;
      setHasUnsavedChanges(hasContent);
    }
  }, [title, blocks, importance, tags, color, icon, initialData]);

  // Convertir les blocs en contenu markdown pour la sauvegarde - CORRIGÉ
  const convertBlocksToMarkdown = useCallback(() => {
    return blocks.map((block) => {
      let blockContent = '';
      
      switch (block.type) {
        case 'text': {
          type TextContent = { text?: string; alignment?: 'left' | 'center' | 'right'; textColor?: string; backgroundColor?: string };

          const c = (
            typeof block.content === 'object' && block.content !== null
              ? block.content
              : { text: String(block.content ?? '') }
          ) as TextContent;

          const text = c.text ?? '';
          const align = c.alignment ?? 'left';
          const textColor = c.textColor ?? '#000000';
          const backgroundColor = c.backgroundColor ?? 'transparent';

          // NOUVEAU: Sauvegarder les couleurs avec les métadonnées
          let metadata = `<!-- data-align:${align}`;
          if (textColor !== '#000000') {
            metadata += ` data-text-color:${textColor}`;
          }
          if (backgroundColor !== 'transparent') {
            metadata += ` data-bg-color:${backgroundColor}`;
          }
          metadata += ' -->';

          blockContent = align !== 'left' || textColor !== '#000000' || backgroundColor !== 'transparent'
            ? `${metadata}${text}`
            : text;
          break;
        }
        case 'heading': {
          const c = (block.content ?? {}) as { text?: string; level?: number };
          const level = c.level ?? 1;
          const text  = c.text ?? '';
          blockContent = '#'.repeat(Math.min(level, 6)) + ' ' + text;
          break;
        }

        case 'table':
          // Ensure headers and rows are always arrays
          const headers = Array.isArray(block.content?.headers) ? block.content.headers : [];
          const rows = Array.isArray(block.content?.rows) ? block.content.rows : [];
          
          if (headers.length === 0) {
            // Default to a simple empty table structure if no headers
            blockContent = '| Column 1 | Column 2 |\n| --- | --- |\n| | |';
          } else {
            // En-tête du tableau
            blockContent = '| ' + headers.join(' | ') + ' |\n';
            // Séparateur
            blockContent += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
            // Lignes
            if (rows.length === 0) {
              // Add an empty row if none exists
              blockContent += '| ' + headers.map(() => '').join(' | ') + ' |';
            } else {
              blockContent += rows.map(row => {
                // Ensure row has the right number of cells
                const paddedRow = [...row];
                while (paddedRow.length < headers.length) paddedRow.push('');
                return '| ' + paddedRow.join(' | ') + ' |';
              }).join('\n');
            }
          }
          break;
        case 'checklist': {
          // CORRECTION: Sauvegarder correctement le format checklist
          const checklistData = (block.content && typeof block.content === 'object') 
            ? block.content as { checklistItems?: unknown[]; showProgress?: boolean }
            : { checklistItems: [], showProgress: true };

          const items = Array.isArray(checklistData.checklistItems) ? checklistData.checklistItems : [];
          const showProgress = checklistData.showProgress !== false;

          type ChecklistItem = { text?: string; checked?: boolean };

          // Générer les métadonnées seulement si nécessaire
          let metaPrefix = '';
          if (!showProgress) {
            metaPrefix = `{{checklist-meta:showProgress:false}}\n`;
          }

          // CORRECTION: Générer le contenu en préservant le texte réel
          const checklistContent = items
            .map((it: unknown) => {
              // CORRECTION: Cast sécurisé vers ChecklistItem
              const item = it as ChecklistItem;
              const text = (item?.text ?? '').trim();
              const checked = item?.checked ?? false;
              return `- [${checked ? 'x' : ' '}] ${text}`;
            })
            .filter(line => line !== '- [ ] ' && line !== '- [x] ') // Filtrer les lignes vides
            .join('\n');

          blockContent = metaPrefix + checklistContent;
          break;
        }
        case 'quote': {
          const q = (typeof block.content === 'object' && block.content !== null)
            ? String((block.content as { text?: string }).text ?? '')
            : String(block.content ?? '');
          blockContent = `> ${q}`;
          break;
        }
        case 'code': {
          type CodeContent = { language?: string; code?: string };
          const c = (
            typeof block.content === 'object' && block.content !== null
              ? block.content
              : { code: String(block.content ?? '') }
          ) as CodeContent;

          const lang = (c.language ?? 'plaintext').trim();
          const langMd = lang === 'plaintext' ? '' : lang;
          const code = c.code ?? '';

          blockContent = `\`\`\`${langMd}\n${code}\n\`\`\``;
          break;
        }
        case 'image': {
          // CORRECTION: Format de sauvegarde plus robuste
          if (!block.content || typeof block.content !== 'object' || !block.content.src) {
            blockContent = ''; // Bloc image vide
            break;
          }

          const imageContent = block.content as { 
            src?: string; 
            alt?: string; 
            caption?: string; 
            wrapText?: string; 
            alignment?: string;
            width?: number;
            height?: number;
            additionalImages?: unknown[];
          };

          const src = String(imageContent.src || '').trim();
          const alt = String(imageContent.alt || '');
          const caption = String(imageContent.caption || '');
          const wrapText = String(imageContent.wrapText || '');
          const alignment = imageContent.alignment || 'center';
          const width = typeof imageContent.width === 'number' ? imageContent.width : 400;
          const height = typeof imageContent.height === 'number' ? imageContent.height : 300;
          const additionalImages = Array.isArray(imageContent.additionalImages) ? imageContent.additionalImages : [];

          if (!src) {
            blockContent = '';
            break;
          }

          // CORRECTION: Format structuré plus lisible
          blockContent = `{{image-data}}
src: ${src}
alt: ${alt}
caption: ${caption}
wrapText: ${wrapText}
alignment: ${alignment}
width: ${width}
height: ${height}
additionalImages: ${JSON.stringify(additionalImages)}
{{/image-data}}`;
          break;
        }
        case 'file': {
          // CORRECTION: Format de sauvegarde plus propre et plus robuste
          if (!block.content || typeof block.content !== 'object' || !block.content.src) {
            blockContent = ''; // Bloc fichier vide
            break;
          }

          const fileContent = block.content as {
            src?: string;
            fileName?: string;
            fileSize?: number;
            fileType?: string;
          };

          const src = String(fileContent.src || '').trim();
          const fileName = String(fileContent.fileName || 'Fichier');
          const fileSize = typeof fileContent.fileSize === 'number' ? fileContent.fileSize : 0;
          const fileType = String(fileContent.fileType || '').trim();

          if (!src) {
            blockContent = '';
            break;
          }

          // CORRECTION: Format STRUCTURÉ plus lisible pour les fichiers
          blockContent = `{{file-data}}
src: ${src}
fileName: ${fileName}
fileSize: ${fileSize}
fileType: ${fileType}
{{/file-data}}`;
          break;
        }
        case 'divider':
          blockContent = '<hr />';
          break;
        case 'spacer':
          blockContent = `{{spacer:${block.content?.height || 40}}}`;
          break;
        default: {
          blockContent = typeof block.content === 'string'
            ? block.content
            : String(block.content ?? '');
          break;
        }
      }
      
      return `{{block-${block.type}-${block.id}}}\n${blockContent}\n{{/block-${block.type}-${block.id}}}`;
    }).join('\n\n');
  }, [blocks]);

  const addTag = (tagValue?: string) => {
    const tagToAdd = tagValue || newTag.trim();
    if (tagToAdd && !tags.includes(tagToAdd)) {
      setTags([...tags, tagToAdd]);
      setNewTag('');
    }
  };

  // Gestion de l'ajout automatique de tag
  const handleTagBlur = () => {
    if (newTag.trim()) {
      addTag();
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      addTag();
    }
  };

  
  // Sauvegarde automatique des brouillons - VERSION CORRIGÉE
  const autoSaveDraft = useCallback(async () => {
    if (!folderId || isEditing) return;
    
    if (!debouncedTitle.trim() && !debouncedBlocks.trim()) return;

    // Éviter les sauvegardes redondantes
    const currentHash = generateContentHash();
    if (currentHash === lastSaveHash) return;

    console.log('🔄 Sauvegarde automatique optimisée...');
    setDraftStatus('saving');
    
    try {
      let parsedTags;
      try {
        parsedTags = JSON.parse(debouncedTags);
      } catch (e) {
        parsedTags = [];
        console.error('Erreur parsing tags pour brouillon:', e);
      }

      const draftData = {
        title: debouncedTitle,
        content: debouncedBlocks,
        importance: debouncedImportance,
        tags: parsedTags,
        color: debouncedColor,
        icon: debouncedIcon,
        folderId
      };

      console.log('📝 Données à sauvegarder:', draftData);

      const url = '/api/drafts';
      const method = currentDraftId ? 'PUT' : 'POST';
      const body = currentDraftId ? { draftId: currentDraftId, ...draftData } : draftData;

      console.log(`🌐 Requête ${method} vers ${url}`);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log('📡 Statut réponse:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erreur réponse:', errorData);
        throw new Error(`Erreur HTTP ${response.status}: ${errorData}`);
      }

      const savedDraft = await response.json();
      console.log('✅ Brouillon sauvegardé:', savedDraft);
      
      if (!currentDraftId && savedDraft._id) {
        setCurrentDraftId(savedDraft._id);
        console.log('🆔 ID brouillon défini:', savedDraft._id);
      }
      
      setLastSaveHash(currentHash);
      setLastSaved(new Date());
      setDraftStatus('saved');
      
      setTimeout(() => setDraftStatus('idle'), 3000);

    } catch (error) {
      console.error('❌ Erreur sauvegarde automatique:', error);
      setDraftStatus('error');
      setTimeout(() => setDraftStatus('idle'), 5000);
    }
  }, [debouncedTitle, debouncedBlocks, debouncedImportance, debouncedTags, debouncedColor, debouncedIcon, folderId, currentDraftId, isEditing, generateContentHash, lastSaveHash]);

  // Effet pour déclencher la sauvegarde après inactivité (2 secondes)
  useEffect(() => {
    // Seulement si on n'est pas en mode édition et qu'il y a du contenu
    if (!isEditing && hasUnsavedChanges && (debouncedTitle.trim() || debouncedBlocks.trim())) {
      console.log('⏱️ Déclenchement sauvegarde après inactivité (2s)');
      autoSaveDraft();
    }
  }, [debouncedTitle, debouncedBlocks, debouncedImportance, debouncedTags, debouncedColor, debouncedIcon, autoSaveDraft, hasUnsavedChanges, isEditing]);

  // Sauvegarde périodique moins fréquente : toutes les 2 minutes au lieu de 30 secondes
  useEffect(() => {
    if (!isEditing && hasUnsavedChanges && (title.trim() || blocks.length > 0)) {
      const interval = setInterval(() => {
        console.log('🕐 Sauvegarde périodique (2 minutes)');
        autoSaveDraft();
      }, 120000); // 2 minutes

      return () => clearInterval(interval);
    }
  }, [isEditing, hasUnsavedChanges, title, blocks, autoSaveDraft]);

  // Supprimer le brouillon après sauvegarde réussie
  const deleteDraftAfterSave = useCallback(async () => {
    if (currentDraftId) {
      try {
        await fetch(`/api/drafts?id=${currentDraftId}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Erreur suppression brouillon:', error);
      }
    }
  }, [currentDraftId]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    if (blocks.length === 0) {
      toast.error("Le contenu ne peut pas être vide");
      return;
    }

    setIsSaving(true);
    try {
      const content = convertBlocksToMarkdown();
      
      if (!content.trim()) {
        toast.error("Le contenu ne peut pas être vide");
        return;
      }

      const saveData = {
        title: title.trim(),
        content,
        importance,
        tags,
        color,
        icon
      };

      console.log("Données à sauvegarder:", saveData);

      await onSave(saveData);
      
      // CORRECTION: Supprimer le brouillon après sauvegarde réussie
      if (draftId) {
        await deleteDraftAfterSave();
      }
      
      const isEditingReport = !!initialData;
      const successMessage = isEditingReport 
        ? "Rapport mis à jour avec succès" 
        : "Rapport créé avec succès";
      
      const authorName = initialData?.author?.name;
      const anonNick = (session?.user as { anonymousNickname?: string })?.anonymousNickname;

      const showAuthorInfo =
        isEditingReport && !!authorName && !!anonNick && authorName !== anonNick;

      toast.success(successMessage, {
        description: showAuthorInfo
          ? `Rapport modifié (auteur original: ${authorName})`
          : undefined,
      });

      // CORRECTION: Ne fermer l'éditeur que pour les nouveaux rapports
      if (!isEditingReport) {
        onCancel(); // Fermer seulement pour les nouveaux rapports
      }
      // Pour les modifications, on reste dans l'éditeur
      
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlocksChange = (next: Block[]) => setBlocks(next);

  // Nouvelle fonction pour sauvegarder manuellement en brouillon
  const handleSaveDraft = async () => {
    if (!folderId) return;
    
    setDraftStatus('saving');
    try {
      const draftData = {
        title,
        content: convertBlocksToMarkdown(),
        importance,
        tags,
        color,
        icon,
        folderId
      };

      const response = await fetch('/api/drafts', {
        method: currentDraftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDraftId ? { draftId: currentDraftId, ...draftData } : draftData)
      });

      if (response.ok) {
        const savedDraft = await response.json();
        if (!currentDraftId) {
          setCurrentDraftId(savedDraft._id);
        }
        setLastSaved(new Date());
        setDraftStatus('saved');
        toast.success("Brouillon sauvegardé manuellement");
        
        setTimeout(() => {
          setDraftStatus('idle');
        }, 3000);
      } else {
        throw new Error('Erreur de sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde manuelle:', error);
      setDraftStatus('error');
      toast.error("Erreur lors de la sauvegarde du brouillon");
      
      setTimeout(() => {
        setDraftStatus('idle');
      }, 5000);
    }
  };

  // Composant pour l'indicateur de statut de brouillon
  const DraftStatusIndicator = () => {
    if (isEditing) {
      return (
        <div className="text-sm text-muted-foreground">
          Modification
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        {draftStatus === 'saving' && (
          <>
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-600 dark:text-blue-400">Sauvegarde automatique...</span>
          </>
        )}
        
        {draftStatus === 'saved' && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-green-600 dark:text-green-400">
              Brouillon sauvegardé {lastSaved && `à ${lastSaved.toLocaleTimeString()}`}
            </span>
          </>
        )}
        
        {draftStatus === 'error' && (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 dark:text-red-400">Erreur de sauvegarde - Réessai automatique</span>
          </>
        )}
        
        {draftStatus === 'idle' && (
          <span className="text-muted-foreground">
            {hasUnsavedChanges ? (
              <>
                <span className="text-amber-600 dark:text-amber-400">Nouveau rapport • Modifications en attente</span>
                {(debouncedTitle.trim() || debouncedBlocks.trim()) && (
                  <span className="ml-2 text-xs">(sauvegarde dans 5s)</span>
                )}
              </>
            ) : (
              'Nouveau rapport'
            )}
          </span>
        )}
      </div>
    );
  };

  // Convertir les blocs en contenu HTML pour l'aperçu - CORRIGÉ avec les couleurs
  const convertBlocksToHTML = useCallback(() => {
    return blocks.map((block) => {
      let blockHTML = '';
      
      switch (block.type) {
        case 'text': {
          type TextContent = { text?: string; alignment?: 'left' | 'center' | 'right'; textColor?: string; backgroundColor?: string };

          const c = (
            typeof block.content === 'object' && block.content !== null
              ? block.content
              : { text: String(block.content ?? '') }
          ) as TextContent;

          const text = c.text ?? '';
          const align = c.alignment ?? 'left';
          const textColor = c.textColor ?? '#000000';
          const backgroundColor = c.backgroundColor ?? 'transparent';

          // CORRECTION: Parser correctement le markdown pour l'aperçu
          const parseTextMarkdown = (text: string) => {
            if (!text) return '';
            
            let result = text;
            
            // Headers
            result = result
              .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
              .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
              .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
              // Bold et Italic
              .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              // Strikethrough
              .replace(/~~(.*?)~~/g, '<del>$1</del>')
              // Code inline
              .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
              // Links
              .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
              // Lists
              .replace(/^\* (.+)/gim, '<li class="ml-4 list-disc">$1</li>')
              .replace(/^\d+\. (.+)/gim, '<li class="ml-4 list-decimal">$1</li>')
              // Blockquotes
              .replace(/^> (.+)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground bg-muted/20 py-2 my-2 rounded-r">$1</blockquote>')
              // Line breaks
              .replace(/\n/g, '<br>');
              
            return result;
          };

          const parsedText = parseTextMarkdown(text);

          // CORRECTION: Styles complets avec couleurs
          const textStyle = `
            text-align: ${align}; 
            ${textColor !== '#000000' ? `color: ${textColor};` : ''} 
            ${backgroundColor !== 'transparent' ? `background-color: ${backgroundColor};` : ''}
            padding: 12px;
            border-radius: 8px;
            ${backgroundColor !== 'transparent' ? 'border: 1px solid rgba(0,0,0,0.1);' : ''}
          `.trim();

          blockHTML = `
            <div class="text-block mb-4" style="${textStyle}">
              <div class="prose prose-sm max-w-none">
                ${parsedText || '<span class="text-muted-foreground">Texte vide</span>'}
              </div>
            </div>
          `;
          break;
        }
        case 'heading': {
          const c = (block.content ?? {}) as { text?: string; level?: number };
          const level = '#'.repeat(c.level ?? 1);
          const text  = c.text ?? '';
          blockHTML = `${level} ${text}`;
          break;
        }
        // AJOUT: Gestion du bloc checklist
        case 'checklist':
          try {
            const checklistData = block.content as { checklistItems?: unknown[]; showProgress?: boolean };
            const checklistItems = Array.isArray(checklistData?.checklistItems) ? checklistData.checklistItems : [];
            const showProgress = checklistData?.showProgress !== false;
            
            let checklistHTML = '<div class="checklist-block mb-6"><div class="space-y-3 bg-background border border-border rounded-lg p-4">';
            
            interface ChecklistItem {
              checked?: boolean;
              text?: string;
            }

            (checklistItems as ChecklistItem[]).forEach((item, itemIndex) => {
              const isChecked = item.checked ?? false;
              const itemText = String(item.text ?? '');
              const textStyle = isChecked ? 'line-through text-muted-foreground opacity-75' : 'text-foreground';
              
              checklistHTML += `
                <div class="flex items-center gap-3 p-2 rounded-md hover:bg-muted/20 transition-colors group">
                  <div class="relative flex-shrink-0">
                    <div class="w-5 h-5 rounded border-2 ${isChecked 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-border bg-background hover:border-primary/50'
                    } transition-all duration-200 flex items-center justify-center">
                      ${isChecked ? `
                        <svg class="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                      ` : ''}
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="${textStyle} transition-all duration-200">${itemText || `Élément ${itemIndex + 1}`}</span>
                  </div>
                  <div class="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    ${isChecked ? 'Terminé' : 'À faire'}
                  </div>
                </div>
              `;
            });
            
            checklistHTML += '</div>';
            
            // NOUVEAU: Ajouter la barre de progression seulement si showProgress est true
            if (showProgress) {
              const totalItems = checklistItems.length;
              const completedItems = checklistItems.filter((item: unknown): item is ChecklistItem => 
                typeof item === 'object' && item !== null && 'checked' in item && (item as ChecklistItem).checked === true
              ).length;
              const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
              
              checklistHTML += `
                <div class="mt-3 px-4 py-2 bg-muted/30 rounded-md border border-border/50">
                  <div class="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Progression</span>
                    <span class="font-medium">${completedItems}/${totalItems} (${progress}%)</span>
                  </div>
                  <div class="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      class="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-out" 
                      style="width: ${progress}%"
                    ></div>
                  </div>
                </div>
              `;
            }
            
            checklistHTML += '</div>';
            blockHTML = checklistHTML;
          } catch (error) {
            console.error("Erreur affichage checklist:", error);
            blockHTML = '<div class="checklist-block mb-4"><div class="p-4 border border-red-300 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded-md">Erreur d\'affichage de la liste de tâches</div></div>';
          }
          break;

        // AJOUT: Gestion du bloc quote - CORRECTION COMPLÈTE
        case 'quote':
          // CORRECTION: Extraire correctement le texte de la citation
          let quoteContent = '';
          if (typeof block.content === 'string') {
            quoteContent = block.content;
          } else if (typeof block.content === 'object' && block.content !== null && 'text' in block.content) {
            quoteContent = String(block.content.text ?? '');
          } else {
            quoteContent = String(block.content ?? '');
          }
          
          // Parser le markdown dans la citation
          const parsedQuote = quoteContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
            .replace(/\n/g, '<br>');
          
          blockHTML = `
            <div class="quote-block mb-6">
              <blockquote class="border-l-4 border-primary pl-6 py-4 italic text-muted-foreground bg-muted/20 rounded-r-lg shadow-sm">
                <div class="text-base leading-relaxed">
                  ${parsedQuote || 'Citation vide'}
                </div>
              </blockquote>
            </div>
          `;
          break;

        // AJOUT: Gestion du bloc file
        case 'file':
          try {
            if (!block.content || typeof block.content !== 'object' || !block.content.src) {
              blockHTML = '<div class="file-block mb-4"><div class="p-4 text-center text-muted-foreground border border-dashed border-border rounded-lg">Aucun fichier sélectionné</div></div>';
              break;
            }

            const fileContent = block.content as {
              src?: string;
              fileName?: string;
              fileSize?: number;
              fileType?: string;
            };

            const fileName = String(fileContent.fileName || 'Fichier');
            const fileSize = typeof fileContent.fileSize === 'number' ? fileContent.fileSize : 0;
            const fileType = String(fileContent.fileType || '');
            const fileSrc = String(fileContent.src || '');

            // Fonction pour formater la taille du fichier
            const formatFileSize = (bytes: number): string => {
              if (bytes === 0) return '0 B';
              const k = 1024;
              const sizes = ['B', 'KB', 'MB', 'GB'];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };

            // Fonction pour obtenir l'icône du fichier
            const getFileIcon = (type: string) => {
              if (type.startsWith('image/')) return '🖼️';
              if (type.startsWith('video/')) return '🎥';
              if (type.startsWith('audio/')) return '🎵';
              if (type.includes('pdf')) return '📄';
              if (type.includes('word')) return '📝';
              if (type.includes('excel') || type.includes('sheet')) return '📊';
              if (type.includes('zip') || type.includes('rar')) return '📦';
              return '📎';
            };

            blockHTML = `
              <div class="file-block mb-4">
                <div class="border border-border rounded-lg p-4 bg-background shadow-sm">
                  <div class="flex items-center gap-4">
                    <div class="text-4xl">
                      ${getFileIcon(fileType)}
                    </div>
                    <div class="flex-1">
                      <h4 class="font-medium text-foreground mb-1">${fileName}</h4>
                      <p class="text-sm text-muted-foreground">
                        ${formatFileSize(fileSize)} • ${fileType || 'Type inconnu'}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <a 
                        href="${fileSrc}" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                      >
                        Ouvrir
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            `;
          } catch (error) {
            console.error("Erreur affichage fichier:", error);
            blockHTML = '<div class="file-block mb-4"><div class="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">Erreur d\'affichage du fichier</div></div>';
          }
          break;
          
        case 'table':
          try {
            // Ensure headers and rows are always arrays
            const headers = Array.isArray(block.content?.headers) ? block.content.headers : [];
            const rows = Array.isArray(block.content?.rows) ? block.content.rows : [];
            
            // If no headers, create default ones
            if (headers.length === 0) {
              headers.push('Column 1', 'Column 2');
            }
            
            // Ensure at least one empty row exists
            if (rows.length === 0) {
              rows.push(headers.map(() => ''));
            }
            
            let tableHTML = `
              <div class="table-block mb-4">
                <div class="w-full overflow-auto rounded-lg border border-border bg-background shadow-sm">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-muted/50 border-b border-border">
            `;
            
            headers.forEach(header => {
              // Traitement sécurisé pour éviter les injections HTML
              const safeHeader = typeof header === 'string' ? 
                header
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;') : '';
              tableHTML += `<th class="px-4 py-3 text-left font-semibold border-r border-border last:border-r-0">${safeHeader || '&nbsp;'}</th>`;
            });
            
            tableHTML += `
                      </tr>
                    </thead>
                    <tbody>
            `;
            
            rows.forEach(row => {
              if (!Array.isArray(row)) return;
              
              tableHTML += `<tr class="border-b border-border last:border-b-0 hover:bg-muted/20">`;
              
              // Ensure each row has the correct number of cells
              const paddedRow = [...row];
              while (paddedRow.length < headers.length) {
                paddedRow.push('');
              }
              
              paddedRow.forEach(cell => {
                // Traitement sécurisé avec support markdown simple
                let safeCell = typeof cell === 'string' ? cell : '';
                
                // Parser markdown simple pour les cellules
                safeCell = safeCell
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/~~(.*?)~~/g, '<del>$1</del>')
                  .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
                
                tableHTML += `<td class="px-4 py-3 border-r border-border last:border-r-0">${safeCell || '&nbsp;'}</td>`;
              });
              
              tableHTML += `</tr>`;
            });
            
            tableHTML += `
                    </tbody>
                  </table>
                </div>
              </div>
            `;
            
            blockHTML = tableHTML;
          } catch (error) {
            console.error("Erreur tableau:", error);
            blockHTML = '<div class="table-block mb-4"><div class="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">Erreur d\'affichage du tableau</div></div>';
          }
          break;
        case 'code':
          // MODIFICATION: Correction complète de l'affichage du code
          try {
            let codeContent = '';
            let codeLanguage = 'plaintext';
            
            if (typeof block.content === 'object' && block.content !== null) {
              codeContent = typeof block.content.code === 'string' ? block.content.code : '';
              codeLanguage = typeof block.content.language === 'string' ? block.content.language : 'plaintext';
            } else {
              codeContent = String(block.content || '');
            }
            
            const escapedCode = codeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            // MODIFICATION: Affichage du langage correct (jamais "CODE" générique)
            const displayLanguage = codeLanguage === 'plaintext' ? 'PLAINTEXT' : codeLanguage.toUpperCase();
            
            blockHTML = `
              <div class="code-block mb-4">
                <div class="bg-muted border border-border rounded-md overflow-hidden">
                  <div class="bg-muted/50 px-4 py-2 border-b border-border">
                    <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">${displayLanguage}</span>
                  </div>
                  <pre class="p-4 overflow-x-auto"><code class="text-sm font-mono text-foreground">${escapedCode}</code></pre>
                </div>
              </div>
            `;
          } catch (error) {
            console.error("Erreur affichage code:", error);
            blockHTML = '<div class="code-block mb-4"><div class="p-4 border border-red-300 bg-red-50 text-red-800 rounded-md">Erreur d\'affichage du code</div></div>';
          }
          break;
          
        case 'image':
          // CORRECTION COMPLÈTE: Vérifier d'abord que block.content existe et est un objet
          if (!block.content || typeof block.content !== 'object' || !block.content.src) {
            blockHTML = '<div class="image-block mb-4"><div class="p-4 text-center text-muted-foreground border border-dashed border-border rounded-lg">Aucune image sélectionnée</div></div>';
            break;
          }
          
          // CORRECTION: Cast correct du contenu
          const imageContent = block.content as { 
            src?: string; 
            alt?: string; 
            caption?: string; 
            wrapText?: string; 
            alignment?: string;
            width?: number;
            height?: number;
            additionalImages?: unknown[];
          };
          
          const src = String(imageContent.src || '');
          const alt = String(imageContent.alt || '').replace(/"/g, '&quot;');
          const caption = imageContent.caption ? `<p class="text-sm text-center text-muted-foreground mt-2">${String(imageContent.caption)}</p>` : '';
          const imageAlignment = imageContent.alignment || 'center';
          const wrapText = String(imageContent.wrapText || '').trim();
          const additionalImages = Array.isArray(imageContent.additionalImages) ? imageContent.additionalImages : [];
          
          // NOUVEAU: Récupérer les dimensions personnalisées
          const customWidth = typeof imageContent.width === 'number' ? imageContent.width : null;
          const customHeight = typeof imageContent.height === 'number' ? imageContent.height : null;
          
          // CORRECTION: Construire les styles d'image avec dimensions personnalisées
          let imageStyle = 'max-width: 100%; height: auto;';
          if (customWidth && customHeight) {
            imageStyle = `width: ${customWidth}px; height: ${customHeight}px; object-fit: cover;`;
          } else if (customWidth) {
            imageStyle = `width: ${customWidth}px; height: auto;`;
          } else {
            imageStyle = 'max-width: 400px; max-height: 300px; width: auto; height: auto;';
          }
          
          // CORRECTION: Gérer tous les cas d'alignement avec les bonnes dimensions
          if (imageAlignment === 'center') {
            blockHTML = `
              <div class="image-block mb-6">
                <div class="text-center my-6">
                  <img src="${src}" alt="${alt}" class="rounded-lg mx-auto shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 inline-block cursor-pointer" style="${imageStyle}" onclick="this.dispatchEvent(new CustomEvent('imageClick', {detail: {src: '${src}', alt: '${alt}'}, bubbles: true}))" />
                  ${caption}
                </div>
                ${wrapText ? `<div class="mt-4 text-center prose prose-sm max-w-none">${wrapText}</div>` : ''}
              </div>
            `;
          } else if (imageAlignment === 'left') {
            // CORRECTION: Afficher l'image même sans texte d'accompagnement avec dimensions personnalisées
            if (wrapText) {
              blockHTML = `
                <div class="image-block mb-6">
                  <div class="flex gap-4 items-start my-6">
                    <img src="${src}" alt="${alt}" class="rounded-lg shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 flex-shrink-0 cursor-pointer" style="${imageStyle} min-width: 200px;" onclick="this.dispatchEvent(new CustomEvent('imageClick', {detail: {src: '${src}', alt: '${alt}'}, bubbles: true}))" />
                    <div class="flex-1 min-w-0 prose prose-sm max-w-none">
                      ${wrapText}
                      ${caption}
                    </div>
                  </div>
                </div>
              `;
            } else {
              // Image alignée à gauche sans texte avec dimensions personnalisées
              blockHTML = `
                <div class="image-block mb-6">
                  <div class="flex justify-start my-6">
                    <div class="text-left">
                      <img src="${src}" alt="${alt}" class="rounded-lg shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 cursor-pointer" style="${imageStyle} min-width: 200px;" onclick="this.dispatchEvent(new CustomEvent('imageClick', {detail: {src: '${src}', alt: '${alt}'}, bubbles: true}))" />
                      ${caption}
                    </div>
                  </div>
                </div>
              `;
            }
          } else if (imageAlignment === 'right') {
            // CORRECTION: Afficher l'image même sans texte d'accompagnement avec dimensions personnalisées  
            if (wrapText) {
              blockHTML = `
                <div class="image-block mb-6">
                  <div class="flex gap-4 items-start my-6">
                    <div class="flex-1 min-w-0 prose prose-sm max-w-none">
                      ${wrapText}
                      ${caption}
                    </div>
                    <img src="${src}" alt="${alt}" class="rounded-lg shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 flex-shrink-0 cursor-pointer" style="${imageStyle} min-width: 200px;" onclick="this.dispatchEvent(new CustomEvent('imageClick', {detail: {src: '${src}', alt: '${alt}'}, bubbles: true}))" />
                  </div>
                </div>
              `;
            } else {
              // Image alignée à droite sans texte avec dimensions personnalisées
              blockHTML = `
                <div class="image-block mb-6">
                  <div class="flex justify-end my-6">
                    <div class="text-right">
                      <img src="${src}" alt="${alt}" class="rounded-lg shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 cursor-pointer" style="${imageStyle} min-width: 200px;" onclick="this.dispatchEvent(new CustomEvent('imageClick', {detail: {src: '${src}', alt: '${alt}'}, bubbles: true}))" />
                      ${caption}
                    </div>
                  </div>
                </div>
              `;
            }
          }

          // NOUVEAU: Affichage des images additionnelles dans l'aperçu
          if (additionalImages.length > 0) {
            blockHTML += `
              <div class="additional-images mt-4">
                <div class="text-sm font-medium text-muted-foreground mb-2">Images additionnelles:</div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            `;
            
            additionalImages.forEach((img: unknown) => {
              const additionalImg = img as { src?: string; alt?: string };
              if (additionalImg.src) {
                blockHTML += `
                  <img 
                    src="${additionalImg.src}" 
                    alt="${additionalImg.alt || 'Image additionnelle'}" 
                    class="w-full h-24 object-cover rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                    onclick="this.dispatchEvent(new CustomEvent('imageClick', {detail: {src: '${additionalImg.src}', alt: '${additionalImg.alt || 'Image additionnelle'}'}, bubbles: true}))"
                  />
                `;
              }
            });
            
            blockHTML += `
                </div>
              </div>
            `;
          }
          break;
          
        case 'divider':
          blockHTML = '<div class="divider-block mb-4"><hr class="border-t-2 border-border my-6" /></div>';
          break;
          
        case 'spacer':
          const height = block.content?.height || 40;
          blockHTML = `<div class="spacer-block mb-4" style="height: ${height}px;"></div>`;
          break;
          
        default:
          blockHTML = `<div class="unknown-block mb-4">${String(block.content || '')}</div>`;
      }
      
      return blockHTML;
    }).join('\n');
  }, [blocks]);

  // Détection des changements dans les blocs pour la sauvegarde automatique
  useEffect(() => {
    const handle = setTimeout(() => {
      if (viewMode === 'edit') {
        // Seulement en mode édition
        autoSaveDraft();
      }
    }, 5000); // 5 secondes

    return () => clearTimeout(handle);
  }, [blocks, title, importance, tags, color, icon, viewMode, autoSaveDraft]);

  // CORRECTION: Gestionnaire d'événements pour le zoom d'image - Déplacé avant le return conditionnel
  useEffect(() => {
    if (viewMode !== 'preview') return;
    
    const handleImageClick = (event: CustomEvent) => {
      const { src, alt } = event.detail;
      // Ouvrir une modale de zoom d'image
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
      modal.onclick = () => modal.remove();
      
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt;
      img.className = 'max-w-full max-h-full object-contain rounded-lg';
      img.onclick = (e) => e.stopPropagation();
      
      modal.appendChild(img);
      document.body.appendChild(modal);
    };

    document.addEventListener('imageClick', handleImageClick as EventListener);
    return () => document.removeEventListener('imageClick', handleImageClick as EventListener);
  }, [viewMode]);

  // Mode aperçu/lecture avec rendu amélioré (CORRIGÉ)
  if (viewMode === 'preview' && (initialData || blocks.length > 0)) {
    return (
      <div className="min-h-screen w-full">
        <div className="max-w-none mx-auto p-8 space-y-6">
          {/* Header en mode lecture */}
          <div className="flex items-center justify-between bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border/50 shadow-sm">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCancel} 
                className="cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={() => setViewMode('edit')}
                className="cursor-pointer"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Éditer
              </Button>
            </div>

          </div>

          {/* Métadonnées du rapport */}
          <div className="bg-background/95 backdrop-blur-sm p-6 rounded-lg border border-border/50 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="text-2xl p-2">
                  {icon}
                </div>
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
              <div className="flex items-center gap-3">
                {selectedImportance && (
                  <Badge className={selectedImportance.color}>
                    {selectedImportance.icon} {selectedImportance.label}
                  </Badge>
                )}
              </div>
            </div>

            {Array.isArray(tags) && tags.length > 0 && (
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contenu en mode lecture avec rendu amélioré */}
          <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-sm overflow-hidden">
            <div className="p-8 prose prose-slate dark:prose-invert max-w-none min-h-[400px] py-8">
              <div 
                dangerouslySetInnerHTML={{
                  __html: convertBlocksToHTML()
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode édition avec blocs modulaires
  return (
    <>
      <div className="min-h-screen w-full" style={{ backgroundColor: "transparent" }}>
        <div className="max-w-none mx-auto p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border/50 shadow-sm">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onCancel} 
                className="cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              
              <div className="h-6 w-px bg-border" />
              
              <DraftStatusIndicator />
            </div>
            
            <div className="flex items-center gap-3">

              {!isEditing && folderId && (
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  size="sm"
                  disabled={draftStatus === 'saving'}
                  className="cursor-pointer"
                >
                  {draftStatus === 'saving' ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder en brouillon
                </Button>
              )}

              {/* NOUVEAU: Bouton aperçu en mode édition */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('preview')}
                className="cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
              
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !title.trim()}
                className="cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isEditing ? 'Mettre à jour' : 'Créer le rapport'}
              </Button>
            </div>
          </div>

          {/* Métadonnées du rapport */}
          <div className="bg-background/95 backdrop-blur-sm p-6 rounded-lg border border-border/50 shadow-sm space-y-6">
            {/* Titre et importance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <Label htmlFor="title">Titre du rapport</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de votre rapport..."
                  className="text-lg font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label>Niveau d&apos;importance</Label>
                <Select value={importance} onValueChange={setImportance}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {importanceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Icône et couleur avec popovers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sélecteur d'icône avec popover */}
              <div className="space-y-2">
                <Label>Icône du rapport</Label>
                <div className="flex items-center gap-3">
                  <div className="text-2xl p-2 bg-muted rounded-lg border">
                    {icon}
                  </div>
                  <ClientSidePopover trigger={
                    <Button variant="outline" size="sm">
                      <Smile className="h-4 w-4 mr-2" />
                      Changer l&apos;icône
                    </Button>
                  }>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Smile className="h-4 w-4 mr-2" />
                        Changer l&apos;icône
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <EmojiPicker
                        onEmojiSelect={setIcon}
                        onOpenChange={() => {}}
                      />
                    </PopoverContent>
                  </ClientSidePopover>
                </div>
              </div>

              {/* Sélecteur de couleur avec popover */}
              <div className="space-y-2">
                <Label>Couleur d&apos;accentuation</Label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg border-2 border-ring shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <ClientSidePopover trigger={
                    <Button variant="outline" size="sm">
                      <Palette className="h-4 w-4 mr-2" />
                      Changer la couleur
                    </Button>
                  }>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Palette className="h-4 w-4 mr-2" />
                        Changer la couleur
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <ColorPalette
                        selectedColor={color}
                        onColorSelect={setColor}
                      />
                    </PopoverContent>
                  </ClientSidePopover>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTags(tags.filter(t => t !== tag))}
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  onBlur={handleTagBlur}
                  placeholder="Ajouter un tag..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag()}
                  disabled={!newTag.trim()}
                  className="cursor-pointer"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </div>

          {/* Éditeur de blocs modulaires */}
          <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Contenu du rapport</h3>
                <p className="text-sm text-muted-foreground">
                  Ajoutez des blocs de contenu et organisez-les comme vous le souhaitez
                </p>
              </div>
              <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
            </div>
          </div>

          {/* Status bar */}
          <div className="bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedImportance && (
                  <Badge className={selectedImportance.color}>
                    {selectedImportance.icon} {selectedImportance.label}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {blocks.length} bloc{blocks.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}