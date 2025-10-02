"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  Bold, Italic, Strikethrough, Code, Link, List, ListOrdered, Quote,
  Type, Table, CheckSquare, ImageIcon, Minus, MoveVertical, Plus,
  ChevronUp, ChevronDown, GripVertical, Trash2, AlignLeft, AlignCenter, AlignRight,
  Eye, ZoomIn, ZoomOut, RotateCcw, Download
} from "lucide-react";
import { uploadToDiscord } from "@/lib/discord-upload";
import { toast } from "sonner";

export interface Block {
  id: string;
  type: 'text' | 'heading' | 'list' | 'table' | 'image' | 'quote' | 'code' | 'divider' | 'checklist' | 'spacer' | 'file';
  content: Record<string, unknown>;
  order: number;
}

const toContent = (v: unknown) => v as unknown as Record<string, unknown>;

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

type BlockProps = {
  block: Block;
  onChange: (block: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

// AJOUT: Fonction utilitaire exportée pour parser le markdown SANS les couleurs
export function parseMarkdownWithColors(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Markdown de base SANS les couleurs
  result = result
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
    // Limiter les sauts de ligne pour l'aperçu
    .replace(/\n/g, ' ');
    
  return result;
}

// CORRECTION: Définir l'interface pour les props de RichTextArea
interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  alignment?: string;
  onAlignmentChange?: (alignment: string) => void;
  // NOUVEAU: Ajout des props pour les couleurs
  textColor?: string;
  backgroundColor?: string;
  onTextColorChange?: (color: string) => void;
  onBackgroundColorChange?: (color: string) => void;
}

// NOUVEAU: Palette de couleurs pour le texte et l'arrière-plan AMÉLIORÉE
const textColorPalette = [
  '#000000', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#059669',
  '#0891b2', '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', '#a855f7', '#c026d3',
  '#db2777', '#e11d48'
];

const backgroundColorPalette = [
  'transparent', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af',
  '#fee2e2', '#fed7aa', '#fef3c7', '#fef08a', '#d9f99d', '#bbf7d0', '#a7f3d0',
  '#a0f0ed', '#bfdbfe', '#c7d2fe', '#ddd6fe', '#e9d5ff', '#f3e8ff',
  '#fce7f3', '#fdf2f8', '#fef7cd', '#ecfccb'
];

// ColorPicker component definition
import React from "react";

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onColorSelect?: (color: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  isOpen,
  onOpenChange,
  title
}) => {
  const [customColor, setCustomColor] = useState(selectedColor);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    if (onColorSelect) onColorSelect(color);
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-1 cursor-pointer border-2"
          style={{
            backgroundColor: selectedColor === 'transparent' ? '#f0f0f0' : selectedColor,
            borderColor: selectedColor === 'transparent' ? '#ddd' : selectedColor,
            position: 'relative'
          }}
          title={title}
        >
          {selectedColor === 'transparent' && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-transparent to-red-500 opacity-50 rounded" />
          )}
          <span
            className="block w-4 h-4 rounded border"
            style={{
              backgroundColor: selectedColor === 'transparent' ? 'transparent' : selectedColor,
              border: selectedColor === 'transparent' ? '1px solid #999' : '1px solid rgba(0,0,0,0.2)'
            }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-64" align="start" sideOffset={5}>
        <div className="space-y-3">
          {/* Palette de couleurs */}
          <div className="grid grid-cols-8 gap-1">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-6 h-6 rounded border-2 cursor-pointer transition-all relative ${
                  selectedColor === color
                    ? "border-primary ring-2 ring-primary scale-110"
                    : "border-border hover:border-primary hover:scale-105"
                }`}
                style={{ 
                  backgroundColor: color === 'transparent' ? '#f0f0f0' : color 
                }}
                onClick={() => {
                  if (onColorSelect) onColorSelect(color);
                  onOpenChange(false);
                }}
                title={color === 'transparent' ? 'Transparent' : color}
              >
                {color === 'transparent' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-transparent to-red-500 opacity-50 rounded" />
                )}
                {selectedColor === color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Séparateur */}
          <div className="border-t border-border"></div>

          {/* Couleur personnalisée */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="w-full text-xs"
            >
              {showCustomInput ? 'Masquer' : 'Couleur personnalisée'}
            </Button>
            
            {showCustomInput && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-12 h-8 p-0 border-0 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 text-xs font-mono"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (onColorSelect) onColorSelect(customColor);
                    onOpenChange(false);
                  }}
                  className="w-full text-xs"
                >
                  Appliquer
                </Button>
              </div>
            )}
          </div>

          {/* Aperçu de la couleur sélectionnée */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Couleur actuelle:</div>
            <div 
              className="w-full h-6 border rounded mt-1 relative"
              style={{ 
                backgroundColor: selectedColor === 'transparent' ? '#f0f0f0' : selectedColor 
              }}
            >
              {selectedColor === 'transparent' && (
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-transparent to-red-500 opacity-50 rounded" />
              )}
              <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-white drop-shadow">
                {selectedColor === 'transparent' ? 'Transparent' : selectedColor}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Composant d'éditeur de texte riche simplifié avec markdown visible
  const RichTextArea = ({ 
    value, 
    onChange, 
    placeholder, 
    className = "", 
    autoFocus = false, 
    multiline = true, 
    alignment = 'left', 
    onAlignmentChange,
    // NOUVEAU: Props pour les couleurs
    textColor = '#000000',
    backgroundColor = 'transparent',
    onTextColorChange,
    onBackgroundColorChange
  }: RichTextAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(value || '');
  const [isPreview] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('recent');
  const [textAlignment, setTextAlignment] = useState(alignment || 'left');
  
  // NOUVEAU: États pour les couleurs
  const [currentTextColor] = useState(textColor);
  const [currentBackgroundColor] = useState(backgroundColor);
  const [isTextColorPickerOpen, setIsTextColorPickerOpen] = useState(false);
  const [isBackgroundColorPickerOpen, setIsBackgroundColorPickerOpen] = useState(false);

  // Synchroniser avec la valeur externe - CORRIGÉ
  useEffect(() => {
    if (value !== content) {
      setContent(value || '');
    }
  }, [value, content]);

  // Parser le markdown en HTML pour l'aperçu - SUPPRESSION des couleurs
  const parseMarkdown = (text: string) => {
    if (!text) return '';
    
    let result = text;
    
    // Markdown SANS les couleurs
    result = result
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h3>')
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
      .replace(/^\* (.+)/gim, '<div class="flex items-start gap-2 ml-4"><span class="text-primary mt-1">•</span><span>$1</span></div>')
      .replace(/^\d+\. (.+)/gim, '<div class="flex items-start gap-2 ml-4"><span class="text-primary font-medium">1.</span><span>$1</span></div>')
      // Blockquotes
      .replace(/^> (.+)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground bg-muted/20 py-2 my-2 rounded-r">$1</blockquote>')
      // Line breaks
      .replace(/\n/g, '<br>');
      
    return result;
  };

  // Gérer les modifications du texte - CORRIGÉ
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange(newContent);
  };
  
  // Insérer du texte à la position du curseur
  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentValue = textarea.value;
    
    const newValue = currentValue.substring(0, startPos) + text + currentValue.substring(endPos);
    setContent(newValue);
    onChange(newValue);
    
    // Rétablir la position du curseur après le texte inséré
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + text.length, startPos + text.length);
    }, 0);
  };
  
  // Insérer du formatage autour du texte sélectionné
  const wrapSelectedText = (before: string, after: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const selectedText = textarea.value.substring(startPos, endPos);
    const currentValue = textarea.value;
    
    // Si aucun texte n'est sélectionné, insérer des placeholders
    if (startPos === endPos) {
      const placeholder = getPlaceholderByFormatting(before);
      const newText = before + placeholder + after;
      const newValue = currentValue.substring(0, startPos) + newText + currentValue.substring(endPos);
      
      setContent(newValue);
      onChange(newValue);
      
      // Sélectionner le placeholder pour faciliter son remplacement
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + before.length, startPos + before.length + placeholder.length);
      }, 0);
    } else {
      // Si du texte est sélectionné, l'entourer avec le formatage
      const newText = before + selectedText + after;
      const newValue = currentValue.substring(0, startPos) + newText + currentValue.substring(endPos);
      
      setContent(newValue);
      onChange(newValue);
      
      // Restaurer la sélection avec le formatage
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + before.length, startPos + before.length + selectedText.length);
      }, 0);
    }
  };
  
  // Récupérer le placeholder en fonction du formatage
  const getPlaceholderByFormatting = (format: string) => {
    switch (format) {
      case '**': return 'texte en gras';
      case '*': return 'texte en italique';
      case '~~': return 'texte barré';
      case '`': return 'code';
      case '[': return 'texte du lien';
      default: return 'texte';
    }
  };

  // Insérer un emoji sans fermer le popover
  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
  };
  
  // Actions de formatage - SUPPRESSION des couleurs et CORRECTION de l'alignement
  const formatActions = {
    bold: () => wrapSelectedText('**', '**'),
    italic: () => wrapSelectedText('*', '*'),
    strikethrough: () => wrapSelectedText('~~', '~~'),
    code: () => wrapSelectedText('`', '`'),
    link: () => {
      const url = prompt('Entrez l\'URL:', 'https://');
      if (url) {
        wrapSelectedText('[', `](${url})`);
      }
    },
    list: () => {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const currentValue = textarea.value;
      const lineStart = currentValue.lastIndexOf('\n', startPos - 1) + 1;
      
      const newValue = currentValue.substring(0, lineStart) + '* ' + currentValue.substring(lineStart);
      setContent(newValue);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + 2, startPos + 2);
      }, 0);
    },
    numberedList: () => {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const currentValue = textarea.value;
      const lineStart = currentValue.lastIndexOf('\n', startPos - 1) + 1;
      
      const newValue = currentValue.substring(0, lineStart) + '1. ' + currentValue.substring(lineStart);
      setContent(newValue);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + 3, startPos + 3);
      }, 0);
    },
    quote: () => {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const currentValue = textarea.value;
      const lineStart = currentValue.lastIndexOf('\n', startPos - 1) + 1;
      
      const newValue = currentValue.substring(0, lineStart) + '> ' + currentValue.substring(lineStart);
      setContent(newValue);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + 2, startPos + 2);
      }, 0);
    },
    h1: () => {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const currentValue = textarea.value;
      const lineStart = currentValue.lastIndexOf('\n', startPos - 1) + 1;
      
      const newValue = currentValue.substring(0, lineStart) + '# ' + currentValue.substring(lineStart);
      setContent(newValue);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + 2, startPos + 2);
      }, 0);
    },
    h2: () => {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const currentValue = textarea.value;
      const lineStart = currentValue.lastIndexOf('\n', startPos - 1) + 1;
      
      const newValue = currentValue.substring(0, lineStart) + '## ' + currentValue.substring(lineStart);
      setContent(newValue);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + 3, startPos + 3);
      }, 0);
    },
    h3: () => {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const currentValue = textarea.value;
      const lineStart = currentValue.lastIndexOf('\n', startPos - 1) + 1;
      
      const newValue = currentValue.substring(0, lineStart) + '### ' + currentValue.substring(lineStart);
      setContent(newValue);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + 4, startPos + 4);
      }, 0);
    },
    alignLeft: () => {
      setTextAlignment('left');
      if (onAlignmentChange) {
        onAlignmentChange('left');
      }
      if (textareaRef.current) {
        textareaRef.current.style.textAlign = 'left';
      }
    },
    alignCenter: () => {
      setTextAlignment('center');
      if (onAlignmentChange) {
        onAlignmentChange('center');
      }
      if (textareaRef.current) {
        textareaRef.current.style.textAlign = 'center';
      }
    },
    alignRight: () => {
      setTextAlignment('right');
      if (onAlignmentChange) {
        onAlignmentChange('right');
      }
      if (textareaRef.current) {
        textareaRef.current.style.textAlign = 'right';
      }
    },
  };

  // Organisation des emojis par catégories - COMPLET
  const emojiCategories = {
    recent: {
      name: "Récents",
      icon: "🕒",
      emojis: ["😀", "😂", "❤️", "👍", "🎉", "🔥", "✨", "😊", "👏", "🙏"]
    },
    smileys: {
      name: "Émoticônes",
      icon: "😀",
      emojis: [
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"
      ]
    },
    people: {
      name: "Personnes",
      icon: "👋",
      emojis: [
        "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦵", "🦿", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👨‍🦰", "👨‍🦱", "👨‍🦳", "👨‍🦲", "👩", "👩‍🦰", "🧑‍🦰", "👩‍🦱", "🧑‍🦱", "👩‍🦳", "🧑‍🦳", "👩‍🦲", "🧑‍🦲", "👱‍♀️", "👱‍♂️", "🧓", "👴", "👵", "🙍", "🙍‍♂️", "🙍‍♀️", "🙎", "🙎‍♂️", "🙎‍♀️", "🙅", "🙅‍♂️", "🙅‍♀️", "🙆", "🙆‍♂️", "🙆‍♀️", "💁", "💁‍♂️", "💁‍♀️", "🙋", "🙋‍♂️", "🙋‍♀️", "🧏", "🧏‍♂️", "🧏‍♀️", "🙇", "🙇‍♂️", "🙇‍♀️", "🤦", "🤦‍♂️", "🤦‍♀️"
      ]
    },
    nature: {
      name: "Nature",
      icon: "🌿",
      emojis: [
        "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐶", "🐈", "🐕‍🦺", "🦮", "🐕", "🐩", "🐺", "🦊", "🦝", "🐱", "🐈‍⬛", "🦁", "🐯", "🐅", "🐆", "🐴", "🐎", "🦄", "🦓", "🦌", "🦬", "🐮", "🐂", "🐃", "🐄", "🐷", "🐖", "🐗", "🐽", "🐏", "🐑", "🐐", "🐪", "🐫", "🦙", "🦒", "🐘", "🦣", "🦏", "🦛", "🐭", "🐁", "🐀", "🐹", "🐰", "🐇", "🐿️", "🦫", "🦔", "🦇", "🐻", "🐻‍❄️", "🐨", "🐼", "🦥", "🦦", "🦨", "🦘", "🦡", "🐾", "🦃", "🐔", "🐓", "🐣", "🐤", "🐥", "🐦", "🐧", "🕊️", "🦅", "🦆", "🦢", "🦉", "🦤", "🪶", "🦩", "🦚", "🦜", "🐸", "🐊", "🐢", "🦎", "🐍", "🐲", "🐉", "🦕", "🦖", "🐳", "🐋", "🐬", "🦭", "🐟", "🐠", "🐡", "🦈", "🐙", "🐚", "🐌", "🦋", "🐛", "🐜", "🐝", "🪲", "🐞", "🦗", "🪳", "🕷️", "🦂", "🦟", "🪰", "🪱", "🦠", "💐", "🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌶️", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🪹", "🪺", "🍄"
      ]
    },
    food: {
      name: "Nourriture",
      icon: "🍔",
      emojis: [
        "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕", "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾"
      ]
    },
    activities: {
      name: "Activités",
      icon: "⚽",
      emojis: [
        "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️", "🤺", "🤾‍♀️", "🤾", "🤾‍♂️", "🏌️‍♀️", "🏌️", "🏌️‍♂️", "🏇", "🧘‍♀️", "🧘", "🧘‍♂️", "🏄‍♀️", "🏄", "🏄‍♂️", "🏊‍♀️", "🏊", "🏊‍♂️", "🤽‍♀️", "🤽", "🤽‍♂️", "🚣‍♀️", "🚣", "🚣‍♂️", "🧗‍♀️", "🧗", "🧗‍♂️", "🚵‍♀️", "🚵", "🚵‍♂️", "🚴‍♀️", "🚴", "🚴‍♂️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫", "🎟️", "🎪", "🤹", "🤹‍♂️", "🤹‍♀️", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼", "🎵", "🎶", "🥁", "🪘", "🎹", "🎷", "🎺", "🎻", "🪕", "🥁", "🪘", "📱", "📲", "☎️", "📞", "📟", "📠", "🔋", "🔌", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "🧮", "🎥", "🎞️", "📽️", "🎬", "📺", "📷", "📸", "📹", "📼", "🔍", "🔎", "🕯️", "💡", "🔦", "🏮", "🪔", "📔", "📕", "📖", "📗", "📘", "📙", "📚", "📓", "📒", "📃", "📜", "📄", "📰", "🗞️", "📑", "🔖", "🏷️", "💰", "🪙", "💴", "💵", "💶", "💷", "💸", "💳", "🧾", "💹"
      ]
    },
    travel: {
      name: "Voyage",
      icon: "✈️",
      emojis: [
        "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "🪝", "⛽", "🚧", "🚦", "🚥", "🚏", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🛖", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪", "🕌", "🛕", "🕍", "🕯️", "🎪", "🌁", "🌃", "🏙️", "🌄", "🌅", "🌆", "🌇", "🌉", "♨️", "🎠", "🎡", "🎢", "💈", "🎪"
      ]
    },
    objects: {
      name: "Objets",
      icon: "💡",
      emojis: [
        "⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪓", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "💄", "💍", "💎", "🔇", "🔈", "🔉", "🔊", "📢", "📣", "📯", "🔔", "🔕", "🎼", "🎵", "🎶", "🎙️", "🎚️", "🎛️", "🎤", "🎧", "📻", "🎷", "🪗", "🎸", "🎹", "🎺", "🎻", "🪕", "🥁", "🪘", "📱", "📲", "☎️", "📞", "📟", "📠", "🔋", "🔌", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "🧮", "🎥", "🎞️", "📽️", "🎬", "📺", "📷", "📸", "📹", "📼", "🔍", "🔎", "🕯️", "💡", "🔦", "🏮", "🪔", "📔", "📕", "📖", "📗", "📘", "📙", "📚", "📓", "📒", "📃", "📜", "📄", "📰", "🗞️", "📑", "🔖", "🏷️", "💰", "🪙", "💴", "💵", "💶", "💷", "💸", "💳", "🧾", "💹"
      ]
    },
    symbols: {
      name: "Symboles",
      icon: "❤️",
      emojis: [
        "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "⚧️", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "🟰", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "👁‍🗨", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧"
      ]
    },
    flags: {
      name: "Drapeaux",
      icon: "🏁",
      emojis: [
        "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇦🇨", "🇦🇩", "🇦🇪", "🇦🇫", "🇦🇬", "🇦🇮", "🇦🇱", "🇦🇲", "🇦🇴", "🇦🇶", "🇦🇷", "🇦🇸", "🇦🇹", "🇦🇺", "🇦🇼", "🇦🇽", "🇦🇿", "🇧🇦", "🇧🇧", "🇧🇩", "🇧🇪", "🇧🇫", "🇧🇬", "🇧🇭", "🇧🇮", "🇧🇯", "🇧🇱", "🇧🇲", "🇧🇳", "🇧🇴", "🇧🇶", "🇧🇷", "🇧🇸", "🇧🇹", "🇧🇻", "🇧🇼", "🇧🇾", "🇧🇿", "🇨🇦", "🇨🇨", "🇨🇩", "🇨🇫", "🇨🇬", "🇨🇭", "🇨🇮", "🇨🇰", "🇨🇱", "🇨🇲", "🇨🇳", "🇨🇴", "🇨🇵", "🇨🇷", "🇨🇺", "🇨🇻", "🇨🇼", "🇨🇽", "🇨🇾", "🇨🇿", "🇩🇪", "🇩🇬", "🇩🇯", "🇩🇰", "🇩🇲", "🇩🇴", "🇩🇿", "🇪🇦", "🇪🇨", "🇪🇪", "🇪🇬", "🇪🇭", "🇪🇷", "🇪🇸", "🇪🇹", "🇪🇺", "🇫🇮", "🇫🇯", "🇫🇰", "🇫🇲", "🇫🇴", "🇫🇷", "🇬🇦", "🇬🇧", "🇬🇩", "🇬🇪", "🇬🇫", "🇬🇬", "🇬🇭", "🇬🇮", "🇬🇱", "🇬🇲", "🇬🇳", "🇬🇵", "🇬🇶", "🇬🇷", "🇬🇸", "🇬🇹", "🇬🇺", "🇬🇼", "🇬🇾", "🇭🇰", "🇭🇲", "🇭🇳", "🇭🇷", "🇭🇹", "🇭🇺", "🇮🇨", "🇮🇩", "🇮🇪", "🇮🇱", "🇮🇲", "🇮🇳", "🇮🇴", "🇮🇶", "🇮🇷", "🇮🇸", "🇮🇹", "🇯🇪", "🇯🇲", "🇯🇴", "🇯🇵", "🇰🇪", "🇰🇬", "🇰🇭", "🇰🇮", "🇰🇲", "🇰🇳", "🇰🇵", "🇰🇷", "🇰🇼", "🇰🇾", "🇰🇿", "🇱🇦", "🇱🇧", "🇱🇨", "🇱🇮", "🇱🇰", "🇱🇷", "🇱🇸", "🇱🇹", "🇱🇺", "🇱🇻", "🇱🇾", "🇲🇦", "🇲🇨", "🇲🇩", "🇲🇪", "🇲🇫", "🇲🇬", "🇲🇭", "🇲🇰", "🇲🇱", "🇲🇲", "🇲🇳", "🇲🇴", "🇲🇵", "🇲🇶", "🇲🇷", "🇲🇸", "🇲🇹", "🇲🇺", "🇲🇻", "🇲🇼", "🇲🇽", "🇲🇾", "🇲🇿", "🇳🇦", "🇳🇨", "🇳🇪", "🇳🇫", "🇳🇬", "🇳🇮", "🇳🇱", "🇳🇴", "🇳🇵", "🇳🇷", "🇳🇺", "🇳🇿", "🇴🇲", "🇵🇦", "🇵🇪", "🇵🇫", "🇵🇬", "🇵🇭", "🇵🇰", "🇵🇱", "🇵🇲", "🇵🇳", "🇵🇷", "🇵🇸", "🇵🇹", "🇵🇼", "🇵🇾", "🇶🇦", "🇷🇪", "🇷🇴", "🇷🇸", "🇷🇺", "🇷🇼", "🇸🇦", "🇸🇧", "🇸🇨", "🇸🇩", "🇸🇪", "🇸🇬", "🇸🇭", "🇸🇮", "🇸🇯", "🇸🇰", "🇸🇱", "🇸🇲", "🇸🇳", "🇸🇴", "🇸🇷", "🇸🇸", "🇸🇹", "🇸🇻", "🇸🇽", "🇸🇾", "🇸🇿", "🇹🇦", "🇹🇨", "🇹🇩", "🇹🇫", "🇹🇬", "🇹🇭", "🇹🇯", "🇹🇰", "🇹🇱", "🇹🇲", "🇹🇳", "🇹🇴", "🇹🇷", "🇹🇹", "🇹🇻", "🇹🇼", "🇹🇿", "🇺🇦", "🇺🇬", "🇺🇲", "🇺🇳", "🇺🇸", "🇺🇾", "🇺🇿", "🇻🇦", "🇻🇨", "🇻🇪", "🇻🇬", "🇻🇮", "🇻🇳", "🇻🇺", "🇼🇫", "🇼🇸", "🇽🇰", "🇾🇪", "🇾🇹", "🇿🇦", "🇿🇲", "🇿🇼", "🏴", "🏴", "🏴"
      ]
    }
  };

  
  
  // Fonction pour rechercher des emojis - AMÉLIORÉE
  const searchEmojis = (query: string) => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    const results: string[] = [];
    
    // Mots-clés pour améliorer la recherche
    const emojiKeywords: { [key: string]: string[] } = {
      "😀": ["sourire", "content", "heureux", "joie"],
      "😂": ["rire", "mdr", "lol", "drole", "mort de rire"],
      "❤️": ["coeur", "amour", "rouge", "love"],
      "🔥": ["feu", "flamme", "chaud", "fire", "cool"],
      "👍": ["pouce", "bien", "ok", "good", "top"],
      "🎉": ["fête", "celebration", "party"],
      "✨": ["étoiles", "brillant", "magie", "sparkle"],
      "😊": ["sourire", "content", "gentil"],
      "👏": ["applaudir", "bravo", "clap"],
      "🙏": ["prier", "merci", "s'il vous plait"]
    };
    

    // Rechercher dans tous les emojis
    Object.values(emojiCategories).forEach(category => {
      category.emojis.forEach(emoji => {
        // Recherche par mots-clés
        const keywords = emojiKeywords[emoji] || [];
        const matchesKeyword = keywords.some(keyword => 
          keyword.includes(searchTerm) || searchTerm.includes(keyword)
        );
        
        // Recherche simple par emoji direct
        const matchesEmoji = emoji.includes(searchTerm);
        
        if ((matchesKeyword || matchesEmoji) && results.length < 50) {
          results.push(emoji);
        }
      });
    });
    
    return results;
  };
  
  // Ajuster la hauteur du textarea automatiquement
  useEffect(() => {
    if (textareaRef.current && multiline) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, multiline]);

  // Focus automatique
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Synchroniser le contenu quand on change de mode preview
  useEffect(() => {
    if (isPreview) {
      // S'assurer que le contenu est à jour quand on passe en mode preview
      onChange(content);
    }
  }, [isPreview, content, onChange]);

  // juste au-dessus du JSX
  const emojiList: string[] = emojiSearchQuery
  ? searchEmojis(emojiSearchQuery)
  : ((emojiCategories as Record<string, { emojis: string[] }>)[activeEmojiCategory]?.emojis ?? []);

  return (
    <div className="space-y-2">
      {/* Toolbar markdown simplifiée */}
      <div className="flex items-center flex-wrap gap-1 bg-muted p-2 rounded-md border border-border">
        {/* Formatage de base */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Button variant="ghost" size="sm" onClick={formatActions.bold} className="h-8 w-8 p-1 cursor-pointer" title="Gras (**texte**)">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.italic} className="h-8 w-8 p-1 cursor-pointer" title="Italique (*texte*)">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.strikethrough} className="h-8 w-8 p-1 cursor-pointer" title="Barré (~~texte~~)">
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.code} className="h-8 w-8 p-1 cursor-pointer" title="Code (`code`)">
            <Code className="h-4 w-4" />
          </Button>
        </div>

        {/* Titres */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Button variant="ghost" size="sm" onClick={formatActions.h1} className="h-8 px-2 cursor-pointer text-xs font-bold" title="Titre 1 (# Titre)">
            H1
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.h2} className="h-8 px-2 cursor-pointer text-xs font-bold" title="Titre 2 (## Titre)">
            H2
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.h3} className="h-8 px-2 cursor-pointer text-xs font-bold" title="Titre 3 (### Titre)">
            H3
          </Button>
        </div>

        {/* Listes et autres */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Button variant="ghost" size="sm" onClick={formatActions.list} className="h-8 w-8 p-1 cursor-pointer" title="Liste (* élément)">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.numberedList} className="h-8 w-8 p-1 cursor-pointer" title="Liste numérotée (1. élément)">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.quote} className="h-8 w-8 p-1 cursor-pointer" title="Citation (> texte)">
            <Quote className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={formatActions.link} className="h-8 w-8 p-1 cursor-pointer" title="Lien [texte](url)">
            <Link className="h-4 w-4" />
          </Button>
        </div>

        {/* AJOUT: Alignement de texte */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Button 
            variant={textAlignment === 'left' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={formatActions.alignLeft} 
            className="h-8 w-8 p-1 cursor-pointer" 
            title="Aligner à gauche"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant={textAlignment === 'center' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={formatActions.alignCenter} 
            className="h-8 w-8 p-1 cursor-pointer" 
            title="Centrer"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button 
            variant={textAlignment === 'right' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={formatActions.alignRight} 
            className="h-8 w-8 p-1 cursor-pointer" 
            title="Aligner à droite"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        {/* NOUVEAU: Couleurs */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <ColorPicker
            colors={textColorPalette}
            selectedColor={currentTextColor}
            onColorSelect={onTextColorChange}
            isOpen={isTextColorPickerOpen}
            onOpenChange={setIsTextColorPickerOpen}
            title="Couleur du texte"
          />
          <ColorPicker
            colors={backgroundColorPalette}
            selectedColor={currentBackgroundColor}
            onColorSelect={onBackgroundColorChange}
            isOpen={isBackgroundColorPickerOpen}
            onOpenChange={setIsBackgroundColorPickerOpen}
            title="Couleur d'arrière-plan"
          />
        </div>

        {/* Bouton Emojis - COMPLÈTEMENT REFAIT */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-1 cursor-pointer" title="Insérer un emoji">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-80" align="start" sideOffset={5}>
              <div className="p-3 border-b border-border">
                <Input
                  placeholder="Rechercher un emoji..."
                  value={emojiSearchQuery}
                  onChange={(e) => setEmojiSearchQuery(e.target.value)}
                  className="text-sm"
                />
              </div>

              {!emojiSearchQuery && (
                <div className="flex overflow-x-auto p-2 border-b border-border bg-muted/20">
                  {Object.entries(emojiCategories).map(([key, category]) => (
                    <button
                      key={key}
                      className={`flex-shrink-0 p-2 mx-1 rounded-md text-lg transition-colors cursor-pointer ${
                        activeEmojiCategory === key 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setActiveEmojiCategory(key)}
                      title={category.name}
                      type="button"
                    >
                      {category.icon}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-2">
                <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
                  {(emojiSearchQuery 
                    ? searchEmojis(emojiSearchQuery)
                    : emojiList.map((emoji: string, index: number) => (
                      <button
                        key={`${emoji}-${index}`}
                        onClick={() => insertEmoji(emoji)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-md text-xl transition-colors cursor-pointer"
                        type="button"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    )))}
                </div>
                
                {emojiSearchQuery && searchEmojis(emojiSearchQuery).length === 0 && (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Aucun emoji trouvé pour &quot;{emojiSearchQuery}&quot;
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground p-3 pt-2 border-t border-border bg-muted/10">
                Cliquez sur un emoji pour l&apos;insérer • Ce menu reste ouvert
              </div>
            </PopoverContent>
          </Popover>
        </div>

      </div>

      {/* Éditeur / Aperçu */}
      {isPreview ? (
        <div 
          ref={previewRef}
          className={`min-h-[100px] w-full border rounded-md p-3 bg-background prose prose-sm max-w-none ${className}`}
          style={{ 
            textAlign: textAlignment as React.CSSProperties['textAlign'],
            color: currentTextColor !== '#000000' ? currentTextColor : undefined,
            backgroundColor: currentBackgroundColor !== 'transparent' ? currentBackgroundColor : undefined
          }}
          dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
        />
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={typeof content === "string" ? content : ""}
            onChange={handleChange}
            placeholder={placeholder}
            className={`min-h-[100px] w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-y bg-background font-mono text-sm ${className}`}
            style={{
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              lineHeight: '1.5',
              overflow: 'hidden',
              textAlign: textAlignment as React.CSSProperties['textAlign'],
              color: currentTextColor !== '#000000' ? currentTextColor : undefined,
              backgroundColor: currentBackgroundColor !== 'transparent' ? currentBackgroundColor : undefined
            }}
            rows={1}
          />
        </div>
      )}
    </div>
  );
};

// Bloc de texte refait avec le nouvel éditeur - CORRECTION pour l'aperçu
const TextBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState<string>(
    typeof block.content === 'object' && block.content
      ? (block.content as Record<string, unknown>).text as string ?? ''
      : (block.content as string) ?? ''
  );
  const [alignment, setAlignment] = useState(block.content?.alignment || 'left');
  
  // NOUVEAU: États pour les couleurs
  const [textColor, setTextColor] = useState(block.content?.textColor || '#000000');
  const [backgroundColor, setBackgroundColor] = useState(block.content?.backgroundColor || 'transparent');

  // Sauvegarder automatiquement - CORRIGÉ pour inclure les couleurs
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onChange({ 
      ...block, 
      content: { 
        text: newContent, 
        alignment: alignment,
        textColor: textColor,
        backgroundColor: backgroundColor
      } 
    });
  };

  // NOUVEAU: Gérer les changements de couleurs
  const handleTextColorChange = (newColor: string) => {
    setTextColor(newColor);
    onChange({ 
      ...block, 
      content: { 
        text: content, 
        alignment: alignment,
        textColor: newColor,
        backgroundColor: backgroundColor
      } 
    });
  };

  const handleBackgroundColorChange = (newColor: string) => {
    setBackgroundColor(newColor);
    onChange({ 
      ...block, 
      content: { 
        text: content, 
        alignment: alignment,
        textColor: textColor,
        backgroundColor: newColor
      } 
    });
  };

  const handleSave = () => {
    onChange({ 
      ...block, 
      content: { 
        text: content, 
        alignment: alignment,
        textColor: textColor,
        backgroundColor: backgroundColor
      } 
    });
    setIsEditing(false);
  };

  // Parser le markdown pour l'affichage - CORRECTION COMPLÈTE
  const parseMarkdown = (text: string) => {
    // CORRECTION: S'assurer que text est une chaîne
    if (!text || typeof text !== 'string') return '';
    
    let result = text;
    
    // CORRECTION: Parser le markdown correctement avec toutes les fonctionnalités
    result = result
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Bold et Italic (ordre important)
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // Code inline
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
      // Lists (avec puces visuelles)
      .replace(/^\* (.+)/gim, '<div class="flex items-start gap-2 ml-4"><span class="text-primary mt-1">•</span><span>$1</span></div>')
      .replace(/^\d+\. (.+)/gim, '<div class="flex items-start gap-2 ml-4"><span class="text-primary font-medium">1.</span><span>$1</span></div>')
      // Blockquotes
      .replace(/^> (.+)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground bg-muted/20 py-2 my-2 rounded-r">$1</blockquote>')
      // Line breaks
      .replace(/\n/g, '<br>');
      
    return result;
  };

  // CORRECTION: Initialiser les états à partir du contenu du bloc
  useEffect(() => {
    if (typeof block.content === 'object' && block.content !== null) {
      setContent(typeof block.content.text === 'string' ? block.content.text : '');
      setAlignment(block.content.alignment || 'left');
      setTextColor(block.content.textColor || '#000000');
      setBackgroundColor(block.content.backgroundColor || 'transparent');
    } else {
      setContent(typeof block.content === 'string' ? block.content : '');
      setAlignment('left');
      setTextColor('#000000');
      setBackgroundColor('transparent');
    }
  }, [block.content]);

  return (
    <div className="group relative" data-block-id={block.id}>
      {/* Boutons de manipulation du bloc */}
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing hover:bg-accent"
            title="Déplacer"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <RichTextArea
            value={typeof content === "string" ? content : ""}
            onChange={handleContentChange}
            placeholder="Tapez votre texte avec support Markdown..."
            autoFocus={true}
            multiline={true}
            alignment={typeof alignment === 'string' ? alignment : 'left'}
            onAlignmentChange={(newAlignment: string) => {
              setAlignment(newAlignment);
              onChange({
                ...block,
                content: {
                  text: content,
                  alignment: newAlignment,
                  textColor: typeof textColor === 'string' ? textColor : '#000000',
                  backgroundColor: typeof backgroundColor === 'string' ? backgroundColor : 'transparent'
                }
              });
            }}
            textColor={typeof textColor === 'string' ? textColor : '#000000'}
            backgroundColor={typeof backgroundColor === 'string' ? backgroundColor : 'transparent'}
            onTextColorChange={handleTextColorChange}
            onBackgroundColorChange={handleBackgroundColorChange}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="cursor-pointer">
              Sauvegarder
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                if (typeof block.content === 'object' && block.content !== null) {
                  setContent(typeof block.content.text === 'string' ? block.content.text : '');
                  setAlignment(block.content.alignment || 'left');
                  setTextColor(block.content.textColor || '#000000');
                  setBackgroundColor(block.content.backgroundColor || 'transparent');
                } else {
                  setContent(typeof block.content === 'string' ? block.content : '');
                  setAlignment('left');
                  setTextColor('#000000');
                  setBackgroundColor('transparent');
                }
                setIsEditing(false);
              }}
              className="cursor-pointer"
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="min-h-[50px] p-4 border border-dashed border-transparent hover:border-border rounded-lg cursor-text transition-colors"
          style={{ 
            textAlign: alignment as React.CSSProperties['textAlign'],
            color: typeof textColor === 'string' && textColor !== '#000000' ? textColor : undefined,
            backgroundColor: typeof backgroundColor === 'string' && backgroundColor !== 'transparent' ? backgroundColor : undefined,
            // NOUVEAU: Ajout d'une bordure subtile si il y a une couleur de fond
            ...(typeof backgroundColor === 'string' && backgroundColor !== 'transparent' ? {
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px'
            } : {})
          }}
        >
          {content ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
            />
          ) : (
            <span className="text-muted-foreground">Cliquez pour écrire avec support Markdown...</span>
          )}
        </div>
      )}
    </div>
  );
};

// CORRECTION: Composant pour un bloc Quote - CORRIGÉ pour éviter [object Object]
const QuoteBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  const [isEditing, setIsEditing] = useState(false);
  // CORRECTION: Extraire correctement le texte de la citation
  const [content, setContent] = useState(() => {
    if (typeof block.content === 'string') {
      return block.content;
    }
    if (typeof block.content === 'object' && block.content !== null && 'text' in block.content) {
      return typeof block.content.text === 'string' ? block.content.text : '';
    }
    return '';
  });

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onChange({ ...block, content: { text: newContent } });
  };

  const handleSave = () => {
    onChange({ ...block, content: { text: content } });
    setIsEditing(false);
  };

  // CORRECTION: Synchroniser avec le contenu du bloc
  useEffect(() => {
    if (typeof block.content === 'string') {
      setContent(block.content);
    } else if (typeof block.content === 'object' && block.content !== null && 'text' in block.content) {
      setContent(typeof block.content.text === 'string' ? block.content.text : '');
    }
  }, [block.content]);

  return (
    <div className="group relative" data-block-id={block.id}>
      {/* Boutons de manipulation du bloc */}
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing hover:bg-accent"
            title="Déplacer"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Votre citation..."
            className="w-full p-3 border rounded-md bg-background resize-y min-h-[100px]"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="cursor-pointer">
              Sauvegarder
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="cursor-pointer">
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <blockquote 
          onClick={() => setIsEditing(true)}
          className="border-l-4 border-primary pl-4 italic text-muted-foreground cursor-text min-h-[50px] p-4 hover:bg-muted/10 transition-colors rounded-lg"
        >
          {content || "Cliquez pour ajouter une citation..."}
        </blockquote>
      )}
    </div>
  );
};

// NOUVEAU: Composant pour un bloc de tableau
const TableBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  const [data, setData] = useState(() => {
    if (block.content && typeof block.content === 'object') {
      const headers = Array.isArray(block.content.headers) ? block.content.headers as string[] : ['Colonne 1', 'Colonne 2'];
      const rows = Array.isArray(block.content.rows) ? block.content.rows as string[][] : [['', ''], ['', '']];
      return { headers, rows };
    }
    return { 
      headers: ['Colonne 1', 'Colonne 2'], 
      rows: [['', ''], ['', '']] 
    };
  });
  
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [tempCellValue, setTempCellValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Parser markdown simple pour les cellules
  const parseMarkdown = (text: string) => {
    if (!text) return text;
    
    let result = text;
    result = result
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
      
    return result;
  };

  const startEditing = (rowIndex: number, colIndex: number, isHeader = false) => {
    const currentValue = isHeader ? data.headers[colIndex] : data.rows[rowIndex][colIndex];
    setTempCellValue(currentValue);
    setEditingCell({ row: isHeader ? -1 : rowIndex, col: colIndex });
  };

  const saveCell = useCallback(() => {
    if (!editingCell) return;
    
    const newData = { ...data };
    if (editingCell.row === -1) {
      newData.headers = [...newData.headers];
      newData.headers[editingCell.col] = tempCellValue;
    } else {
      newData.rows = newData.rows.map((row, index) => 
        index === editingCell.row 
          ? row.map((cell, cellIndex) => 
              cellIndex === editingCell.col ? tempCellValue : cell
            )
          : row
      );
    }
    
    setData(newData);
    onChange({ ...block, content: newData });
    setEditingCell(null);
    setTempCellValue('');
  }, [editingCell, tempCellValue, data, block, onChange]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      saveCell();
    }, 150);
  }, [saveCell]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      saveCell();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempCellValue('');
    }
  }, [saveCell]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell, inputRef]);

  return (
    <div className="group relative">
      {/* Boutons de manipulation du bloc */}
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 cursor-pointer">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto border border-border rounded-lg bg-background p-4">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              {data.headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  className="border-b border-border px-4 py-2 bg-muted/30 text-left font-semibold cursor-pointer"
                  onClick={() => startEditing(-1, colIndex, true)}
                >
                  {editingCell && editingCell.row === -1 && editingCell.col === colIndex ? (
                    <input
                      ref={inputRef}
                      value={tempCellValue}
                      onChange={(e) => setTempCellValue(e.target.value)}
                      onBlur={handleBlur}
                      onKeyDown={handleKeyDown}
                      className="border rounded px-2 py-1 text-sm w-full"
                    />
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: parseMarkdown(header) }} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className="border-b border-border px-4 py-2 cursor-pointer"
                    onClick={() => startEditing(rowIndex, colIndex)}
                  >
                    {editingCell && editingCell.row === rowIndex && editingCell.col === colIndex ? (
                      <input
                        ref={inputRef}
                        value={tempCellValue}
                        onChange={(e) => setTempCellValue(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="border rounded px-2 py-1 text-sm w-full"
                      />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: parseMarkdown(cell) }} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Composant pour un bloc d'image avec alignement (CORRIGÉ)
const ImageBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [alignment, setAlignment] = useState(block.content?.alignment || 'center');
  const [wrapText, setWrapText] = useState<string>(String(block.content?.wrapText || ''));
  const [caption, setCaption] = useState<string>(String(block.content?.caption || ''));
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 400, height: 300 });
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  // NOUVEAU: États pour l'ajout d'image par URL
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  
  type ExtraImg = { src: string; alt?: string; caption?: string; width?: number; height?: number };
  const [additionalImages, setAdditionalImages] =
    useState<ExtraImg[]>(Array.isArray(block.content?.additionalImages) ? block.content!.additionalImages as ExtraImg[] : []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // CORRECTION: Fonction pour extraire l'URL d'un markdown d'image
  const extractImageUrl = (content: unknown): string | null => {
    if (typeof content === 'string') {
      // Extraire l'URL du format markdown ![alt](url)
      const markdownMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
      if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1];
      }
    }
    
    if (typeof content === 'object' && content !== null && 'src' in content) {
      return typeof content.src === 'string' ? content.src : null;
    }
    
    return null;
  };

  // CORRECTION: Obtenir l'URL de l'image de manière sécurisée
  const getImageSrc = (): string | null => {
    if (block.content?.src && typeof block.content.src === 'string') {
      return block.content.src;
    }
    
    return extractImageUrl(block.content);
  };

  // NOUVEAU: Fonction pour ajouter une image par URL
  const handleImageUrl = () => {
    if (!imageUrl.trim()) {
      toast.error("Veuillez entrer une URL valide");
      return;
    }

    // Validation basique de l'URL
    try {
      new URL(imageUrl);
    } catch {
      toast.error("URL invalide");
      return;
    }

    const imageSrc = getImageSrc();
    
    if (imageSrc) {
      // Ajouter comme image additionnelle
      const newAdditionalImages = [...additionalImages, {
        src: imageUrl,
        alt: 'Image depuis URL',
        caption: ''
      }];
      setAdditionalImages(newAdditionalImages);
      onChange({ 
        ...block, 
        content: { 
          ...block.content,
          additionalImages: newAdditionalImages
        } 
      });
    } else {
      // Définir comme image principale
      onChange({ 
        ...block, 
        content: { 
          ...block.content,
          src: imageUrl, 
          alt: 'Image depuis URL',
          alignment,
          wrapText,
          caption,
          width: imageSize.width,
          height: imageSize.height,
          additionalImages
        } 
      });
    }
    
    setImageUrl('');
    setShowUrlInput(false);
    toast.success("Image ajoutée depuis l'URL");
  };

  const handleImageUpload = async (file: File, isAdditional = false) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("L'image est trop lourde. Maximum  8MB.");
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadToDiscord(file);
      
      if (isAdditional) {
        const newAdditionalImages = [...additionalImages, {
          src: imageUrl,
          alt: file.name,
          caption: ''
        }];
        setAdditionalImages(newAdditionalImages);
        // CORRECTION: Sauvegarder avec toutes les données existantes
        onChange({ 
          ...block, 
          content: { 
            ...block.content,
            additionalImages: newAdditionalImages
          } 
        });
      } else {
        onChange({ 
          ...block, 
          content: { 
            ...block.content,
            src: imageUrl, 
            alt: file.name,
            alignment,
            wrapText,
            caption,
            width: imageSize.width,
            height: imageSize.height,
            additionalImages
          } 
        });
      }
      toast.success("Image ajoutée avec succès");
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  const updateContent = (key: string, value: unknown) => {
    const newContent = { 
      ...block.content,
      [key]: value 
    };
    onChange({ 
      ...block, 
      content: newContent 
    });
  };

  // NOUVEAU: Remplacer l'image principale
  const handleReplaceImage = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("L'image est trop lourde. Maximum 8MB.");
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadToDiscord(file);
      
      onChange({ 
        ...block, 
        content: { 
          ...block.content,
          src: imageUrl, 
          alt: file.name,
          alignment,
          wrapText,
          caption,
          width: imageSize.width,
          height: imageSize.height,
          additionalImages
        } 
      });
      setImageError(false);
      toast.success("Image remplacée avec succès");
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors du remplacement de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  // NOUVEAU: Supprimer une image additionnelle
  const removeAdditionalImage = (index: number) => {
    const newAdditionalImages = additionalImages.filter((_, i) => i !== index);
    setAdditionalImages(newAdditionalImages);
    updateContent('additionalImages', newAdditionalImages);
  };

  // Effet d'initialisation / synchronisation : ne dépendre que de block.content
  useEffect(() => {
    const bc = block.content as Record<string, unknown> | undefined;
    if (!bc) return;

    // Mettre à jour uniquement si la valeur diffère (évite boucle)
    if (typeof bc.alignment === 'string' && bc.alignment !== alignment) {
      setAlignment(bc.alignment);
    }

    if (typeof bc.wrapText === 'string' && bc.wrapText !== wrapText) {
      setWrapText(bc.wrapText);
    }

    if (typeof bc.caption === 'string' && bc.caption !== caption) {
      setCaption(bc.caption);
    }

    // AJOUT: Gestion de la taille d'image
    const newWidth = typeof bc.width === 'number' ? bc.width : 400;
    const newHeight = typeof bc.height === 'number' ? bc.height : 300;
    if (newWidth !== imageSize.width || newHeight !== imageSize.height) {
      setImageSize({ width: newWidth, height: newHeight });
    }

    if (Array.isArray(bc.additionalImages)) {
      const newImgs = bc.additionalImages as unknown[];
      const same =
        newImgs.length === additionalImages.length &&
        newImgs.every((img, i) => JSON.stringify(img) === JSON.stringify(additionalImages[i]));

      if (!same) {
        setAdditionalImages(newImgs as ExtraImg[]);
      }
    }
  }, [block.content, additionalImages, alignment, caption, wrapText, imageSize]);

  // NOUVEAU: Composant de visualisation d'image avec zoom
  const ImageViewer = () => {
    const imageSrc = getImageSrc();
    if (!imageSrc) return null;

    const handleDownload = () => {
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = String(block.content?.alt || 'image');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>Aperçu de l&apos;image</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
                  className="cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-mono min-w-[60px] text-center">{zoomLevel}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(Math.min(500, zoomLevel + 25))}
                  className="cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setZoomLevel(100);
                    setRotation(0);
                  }}
                  className="cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center items-center p-4 overflow-auto max-h-[80vh]">
            <div
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              <img
                src={imageSrc}
                alt={String(block.content?.alt || 'Image')}
                className="max-w-none"
                style={{ 
                  width: 'auto',
                  height: 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none'
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  const imageSrc = getImageSrc();

  return (
    <div className="group relative">
      {/* Boutons de manipulation du bloc */}
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 cursor-pointer">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {imageSrc ? (
          <>
            {/* Contrôles d'image améliorés */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={alignment === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAlignment('left');
                    updateContent('alignment', 'left');
                  }}
                  className="cursor-pointer"
                >
                  <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant={alignment === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAlignment('center');
                    updateContent('alignment', 'center');
                  }}
                  className="cursor-pointer"
                >
                  <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                  variant={alignment === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAlignment('right');
                    updateContent('alignment', 'right');
                  }}
                  className="cursor-pointer"
                >
                  <AlignRight className="w-4 h-4" />
                </Button>
              </div>

              {/* NOUVEAU: Options d'image avec ajout par URL */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => replaceInputRef.current?.click()}
                  disabled={isUploading}
                  className="cursor-pointer"
                >
                  {isUploading ? "Upload..." : "Remplacer"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Fichier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImageOptions(!showImageOptions)}
                  className="cursor-pointer"
                >
                  Options
                </Button>
              </div>
            </div>

            {/* NOUVEAU: Input pour ajouter image par URL */}
            {showUrlInput && (
              <div className="p-3 border border-border rounded-lg bg-muted/10 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleImageUrl}
                    disabled={!imageUrl.trim()}
                    className="cursor-pointer"
                  >
                    Ajouter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUrlInput(false);
                      setImageUrl('');
                    }}
                    className="cursor-pointer"
                  >
                    Annuler
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Entrez l&aposURL complète d&aposune image accessible publiquement
                </p>
              </div>
            )}

            {/* NOUVEAU: Options avancées d'image */}
            {showImageOptions && (
              <div className="p-3 border border-border rounded-lg bg-muted/10 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Largeur:</span>
                    <Input
                      type="number"
                      value={imageSize.width}
                      onChange={(e) => {
                        const newWidth = parseInt(e.target.value) || 100;
                        const aspectRatio = imageSize.height / imageSize.width;
                        const newHeight = Math.round(newWidth * aspectRatio);
                        setImageSize({ width: newWidth, height: newHeight });
                        updateContent('width', newWidth);
                        // updateContent('height', newHeight);
                      }}
                      className="w-20 text-sm"
                      min="100"
                      max="1000"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Hauteur:</span>
                    <Input
                      type="number"
                      value={imageSize.height}
                      onChange={(e) => {
                        const newHeight = parseInt(e.target.value) || 75;
                        const aspectRatio = imageSize.width / imageSize.height;
                        const newWidth = Math.round(newHeight * aspectRatio);
                        setImageSize({ width: newWidth, height: newHeight });
                        updateContent('width', newWidth);
                        updateContent('height', newHeight);
                      }}
                      className="w-20 text-sm"
                      min="75"
                      max="1000"
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageSize({ width: 400, height: 300 });
                      updateContent('width', 400);
                      updateContent('height', 300);
                    }}
                    className="cursor-pointer"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}

            {/* Container d'image */}
            <div className={`${
              alignment === 'center' ? 'space-y-4' : 
              alignment === 'left' ? 'flex gap-4 items-start' :
              'flex gap-4 items-start flex-row-reverse'
            }`}>
              {/* Image principale sans handles de redimensionnement */}
              <div 
                className={`relative flex-shrink-0 ${
                  alignment === 'center' ? 'w-full flex justify-center' : 
                  alignment === 'left' ? 'justify-start' :
                  'justify-end'
                }`}
              >
                <div 
                  className="relative group/image border border-border rounded-lg overflow-hidden"
                  style={{ 
                    width: `${imageSize.width}px`, 
                    height: `${imageSize.height}px`,
                    minWidth: '100px',
                    minHeight: '75px'
                  }}
                >
                  {/* Image */}
                  {!imageError ? (
                    <img
                      src={imageSrc}
                      alt={String(block.content?.alt || 'Image')}
                      className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-[1.02]"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                      onClick={() => setImageViewerOpen(true)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted border border-border rounded flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                        <span className="text-sm">Erreur de chargement</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay de zoom */}
                  <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover/image:opacity-100 transition-opacity bg-white/90 dark:bg-black/90 rounded-full p-2">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Texte d'accompagnement */}
              {alignment !== 'center' && (
                <div className="flex-1 min-w-0">
                  <Input
                    value={wrapText}
                    onChange={(e) => {
                      setWrapText(e.target.value);
                      updateContent('wrapText', e.target.value);
                    }}
                    placeholder="Texte d'accompagnement..."
                    className="border-none shadow-none text-sm w-full"
                  />
                </div>
              )}
            </div>

            {/* NOUVEAU: Images additionnelles */}
            {additionalImages.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Images additionnelles:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {additionalImages.map((img, index) => (
                    <div key={index} className="relative group/additional">
                      <img
                        src={img.src}
                        alt={img.alt || `Image ${index + 1}`}
                        className="w-full h-24 object-cover rounded border border-border cursor-pointer"
                        onClick={() => setImageViewerOpen(true)}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAdditionalImage(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover/additional:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Légende de l'image */}
            <Input
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                updateContent('caption', e.target.value);
              }}
              placeholder="Légende de l'image..."
              className="text-center text-sm text-muted-foreground border-none shadow-none"
            />
          </>
        ) : (
          <div className="space-y-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Upload en cours...</span>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Cliquez pour ajouter une image</p>
                </>
              )}
            </div>
            
            {/* NOUVEAU: Option pour ajouter par URL quand aucune image */}
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="cursor-pointer"
              >
                Ou ajouter depuis une URL
              </Button>
            </div>
            
            {/* NOUVEAU: Input URL pour image vide */}
            {showUrlInput && (
              <div className="p-3 border border-border rounded-lg bg-muted/10 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemple.com/image.jpg"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleImageUrl}
                    disabled={!imageUrl.trim()}
                    className="cursor-pointer"
                  >
                    Ajouter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUrlInput(false);
                      setImageUrl('');
                    }}
                    className="cursor-pointer"
                  >
                    Annuler
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Entrez l&aposURL complète d&aposune image accessible publiquement
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Input pour ajouter une image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (imageSrc) {
                handleImageUpload(file, true); // Ajouter comme image additionnelle
              } else {
                handleImageUpload(file, false); // Ajouter comme image principale
              }
            }
          }}
          className="hidden"
        />
        
        {/* Input pour remplacer l'image */}
        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReplaceImage(file);
          }}
          className="hidden"
        />
      </div>

      <ImageViewer />
    </div>
  );
};

// NOUVEAU: Composant pour un bloc de fichier
const FileBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string>(String(block.content?.fileName || ''));
  const [fileSize, setFileSize] = useState<number>(Number(block.content?.fileSize || 0));
  const [fileType, setFileType] = useState<string>(String(block.content?.fileType || ''));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CORRECTION: Synchroniser les états avec le contenu du bloc
  useEffect(() => {
    if (block.content) {
      setFileName(String(block.content.fileName || ''));
      setFileSize(Number(block.content.fileSize || 0));
      setFileType(String(block.content.fileType || ''));
    }
  }, [block.content]);

  const getFileSrc = (): string | null => {
    if (block.content?.src && typeof block.content.src === 'string') {
      return block.content.src;
    }
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  const handleFileUpload = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Le fichier est trop lourd. Maximum 25MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileUrl = await uploadToDiscord(file);
      
      setFileName(file.name);
      setFileSize(file.size);
      setFileType(file.type);
      
      // CORRECTION: S'assurer que toutes les données sont sauvegardées
      onChange({ 
        ...block, 
        content: { 
          src: fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream'
        } 
      });
      
      toast.success("Fichier ajouté avec succès");
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload du fichier");
    } finally {
      setIsUploading(false);
    }
  };

  const fileSrc = getFileSrc();

  return (
    <div className="group relative">
      {/* Boutons de manipulation du bloc */}
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-grab">
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 cursor-pointer">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {fileSrc ? (
          <div className="border border-border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {getFileIcon(fileType)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{fileName}</h4>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(fileSize)} • {fileType || 'Type inconnu'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(fileSrc, '_blank')}
                  className="cursor-pointer"
                >
                  Ouvrir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="cursor-pointer"
                >
                  {isUploading ? "Upload..." : "Remplacer"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Upload en cours...</span>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">📎</div>
                <p className="text-sm text-muted-foreground">Cliquez pour ajouter un fichier</p>
                <p className="text-xs text-muted-foreground mt-1">Vidéos, audios, documents... (Max 25MB)</p>
              </>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className="hidden"
        />
      </div>
    </div>
  );
};

// CodeBlock avec éditeur amélioré
const CodeBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  type CodeContent = { code?: string; language?: string } | null;
  const cc = block.content as CodeContent;
  const [content, setContent] = useState<string>(cc?.code ?? "");
  const [language, setLanguage] = useState<string>(cc?.language ?? "javascript");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onChange({ ...block, content: toContent({ code: content, language }) });
    setIsEditing(false);
  };
  
  const languages = [
    'javascript', 'typescript', 'python', 'java', 'html', 'css', 'json', 'markdown', 'bash', 'sql', 'php', 'go', 'rust', 'cpp'
  ];

  return (
    <div className="group relative">
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-grab">
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 cursor-pointer">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
          </Select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Votre code ici..."
            className="min-h-[120px] w-full border rounded-md p-3 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="cursor-pointer">
              Sauvegarder
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="cursor-pointer">
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div onClick={() => setIsEditing(true)} className="cursor-text">
          <div className="bg-muted border border-border rounded-md overflow-hidden my-4">
            <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {language}
              </span>
            </div>
            <pre className="p-4 overflow-x-auto min-h-[80px] flex items-center">
              <code className="text-sm font-mono text-foreground">
                {content || 'Cliquez pour ajouter du code...'}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant pour un bloc de titre
const HeadingBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  const hc = block.content as { text?: string; level?: number } | null;
  const [content, setContent] = useState<string>(hc?.text ?? "");
  const [level, setLevel] = useState<number>(hc?.level ?? 1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (newContent: string, newLevel?: number) => {
    const updatedContent = { text: newContent, level: newLevel || level };
    setContent(newContent);
    if (newLevel) setLevel(newLevel);
    onChange({ ...block, content: updatedContent });
  };

  const getHeadingClass = (level: number) => {
    const classes = {
      1: "text-3xl font-bold",
      2: "text-2xl font-bold", 
      3: "text-xl font-semibold",
      4: "text-lg font-semibold",
      5: "text-base font-semibold",
      6: "text-sm font-semibold"
    };
    return classes[level as keyof typeof classes] || classes[1];
  };

  return (
    <div className="group relative">
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-grab">
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 cursor-pointer">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Select value={level.toString()} onValueChange={(value) => handleChange(content, parseInt(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1,2,3,4,5,6].map(h => (
              <SelectItem key={h} value={h.toString()}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={inputRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Titre..."
          className={`flex-1 border-none shadow-none focus-visible:ring-0 ${getHeadingClass(level)}`}
        />
      </div>
    </div>
  );
};

// Composant pour un séparateur
const DividerBlock = ({ onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  return (
    <div className="group relative">
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab"
            title="Déplacer"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <hr className="border-t-2 border-border my-6" />
    </div>
  );
};

// Composant pour le bloc d'espacement
const SpacerBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
  const initialHeight = typeof block.content === 'object' && block.content !== null && typeof block.content.height === 'number' 
    ? block.content.height 
    : 40;
  
  const [height, setHeight] = useState(initialHeight);
  
  const handleHeightChange = (newHeight: number[]) => {
    if (Array.isArray(newHeight) && newHeight.length > 0) {
      const value = newHeight[0];
      setHeight(value);
      onChange({ ...block, content: { height: value } });
    }
  };

  const presetSizes = [
    { label: 'Petit', value: 20 },
    { label: 'Moyen', value: 40 },
    { label: 'Grand', value: 80 },
    { label: 'Très grand', value: 160 }
  ];

  return (
    <div className="group relative">
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-grab">
            <GripVertical className="h-3 w-3" />
          </Button>
          {canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveUp}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Monter"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          )}
          {canMoveDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMoveDown}
              className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
              title="Descendre"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="border border-dashed border-border rounded-md p-4 bg-muted/10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MoveVertical className="h-4 w-4" />
              <span>Espacement: {height}px</span>
            </div>
            <div className="flex gap-2">
              {presetSizes.map((size) => (
                <Button
                  key={size.value}
                  variant={height === size.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleHeightChange([size.value])}
                  className="cursor-pointer"
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="px-2">
            <Slider 
              value={[height]} 
              min={0} 
              max={200} 
              step={4}
              onValueChange={handleHeightChange}
            />
          </div>
          
          <div className="relative w-full bg-muted/20 rounded-md">
            <div 
              className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs"
              style={{ height: `${height}px` }}
            >
              {height}px
            </div>
            <div style={{ height: `${height}px` }} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal BlockEditor - Suppression du système global de toolbar
export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  
  const addBlock = useCallback(async (type: Block['type'], afterIndex?: number) => {
    if (isAddingBlock) return; // Éviter les ajouts multiples
    
    setIsAddingBlock(true);
    
    try {
      const newBlock: Block = {
        id: Date.now().toString(),
        type,
        content: toContent(getDefaultContent(type)),
        order: afterIndex !== undefined ? afterIndex + 1 : blocks.length
      };

      const newBlocks = [...blocks];
      if (afterIndex !== undefined) {
        newBlocks.splice(afterIndex + 1, 0, newBlock);
        // Réajuster les ordres
        newBlocks.forEach((block, index) => {
          block.order = index;
        });
      } else {
        newBlocks.push(newBlock);
      }

      onChange(newBlocks);
    } finally {
      // Permettre un nouvel ajout après un délai
      setTimeout(() => setIsAddingBlock(false), 1000);
    }
  }, [blocks, onChange, isAddingBlock]);

  const getDefaultContent = (type: Block['type']) => {
    switch (type) {
      case 'heading': return { text: '', level: 1 };
      case 'table': return { headers: ['Colonne 1', 'Colonne 2'], rows: [['', ''], ['', '']] };
      case 'checklist': return { checklistItems: [{ text: '', checked: false }], showProgress: true };
      case 'list': return [''];
      case 'quote': return { text: '' };
      case 'code': return { code: '', language: 'javascript' };
      case 'image': return { src: '', alt: '', caption: '', additionalImages: [] };
      case 'file': return { src: '', fileName: '', fileSize: 0, fileType: '' };
      case 'divider': return {};
      case 'spacer': return { height: 40 };
      default: return { text: '', alignment: 'left', textColor: '#000000', backgroundColor: 'transparent' };
    }
  };

  const updateBlock = (updatedBlock: Block) => {
    const newBlocks = blocks.map(block => 
      block.id === updatedBlock.id ? updatedBlock : block
    );
    onChange(newBlocks);
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId);
    onChange(newBlocks);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const currentIndex = blocks.findIndex(block => block.id === blockId);
    if (currentIndex === -1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    // Échanger les blocs
    [newBlocks[currentIndex], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[currentIndex]];
    
    // Mettre à jour les ordres
    newBlocks.forEach((block, index) => {
      block.order = index;
    });

    onChange(newBlocks);
  };

  // CORRECTION COMPLÈTE: ChecklistBlock - FIX définitif de la perte de focus
  const ChecklistBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: BlockProps) => {
    type ChecklistItem = { text: string; checked: boolean };

    // CORRECTION: Initialiser correctement depuis le contenu du bloc
    const [items, setItems] = useState<ChecklistItem[]>(() => {
      // Vérifier le nouveau format avec checklistItems
      if (block.content && typeof block.content === 'object' && 'checklistItems' in block.content) {
        const checklistItems = block.content.checklistItems;
        if (Array.isArray(checklistItems)) {
          return checklistItems.map(item => ({
            text: typeof item === 'object' && item !== null && 'text' in item ? String(item.text || '') : String(item || ''),
            checked: typeof item === 'object' && item !== null && 'checked' in item ? Boolean(item.checked) : false
          }));
        }
      }
      
      // FALLBACK: Ancien format avec array direct
      if (Array.isArray(block.content)) {
        return block.content.map(item => ({
          text: typeof item === 'object' && item !== null && 'text' in item ? String(item.text || '') : String(item || ''),
          checked: typeof item === 'object' && item !== null && 'checked' in item ? Boolean(item.checked) : false
        }));
      }
      
      return [{ text: '', checked: false }];
    });

    // État pour afficher/masquer la barre de progression
    const [showProgress, setShowProgress] = useState(() => {
      if (block.content && typeof block.content === 'object' && 'showProgress' in block.content) {
        return block.content.showProgress !== false;
      }
      return true;
    });

    // NOUVEAU: Timer pour sauvegarder seulement après inactivité complète
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);

    // CORRECTION FINALE: Sauvegarder seulement quand l'utilisateur arrête de taper
    const debouncedSave = useCallback((newItems: ChecklistItem[]) => {
      // Annuler le timer précédent
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Programmer la sauvegarde après 1 seconde d'inactivité COMPLÈTE
      saveTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onChange({ 
          ...block, 
          content: { 
            checklistItems: newItems,
            showProgress: showProgress
          } 
        });
      }, 1000);
    }, [block, onChange, showProgress]);

    // CORRECTION: Fonction pour mettre à jour SEULEMENT l'état local pendant la frappe
   
    const updateItemText = useCallback((index: number, newText: string) => {
      isTypingRef.current = true;
      const newItems = [...items];
      newItems[index] = { ...newItems[index], text: newText };
      setItems(newItems);
      
      // Programmer la sauvegarde mais ne pas sauvegarder tout de suite
      debouncedSave(newItems);
    }, [items, debouncedSave]);

    // CORRECTION: Fonction pour mettre à jour le checkbox AVEC sauvegarde immédiate
    const updateItemChecked = useCallback((index: number, checked: boolean) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], checked };
      setItems(newItems);
      
      // Sauvegarder immédiatement pour les checkboxes (pas de frappe)
      onChange({ 
        ...block, 
        content: { 
          checklistItems: newItems,
          showProgress: showProgress
        } 
      });
    }, [items, block, onChange, showProgress]);

    // CORRECTION: Fonction addItem qui sauvegarde immédiatement
    const addItem = useCallback(() => {
      const newItems: ChecklistItem[] = [...items, { text: '', checked: false }];
      
      setItems(newItems);
      onChange({ 
        ...block, 
        content: { 
          checklistItems: newItems,
          showProgress: showProgress
        } 
      });
    }, [items, showProgress, block, onChange]);

    // CORRECTION: Fonction removeItem qui sauvegarde immédiatement
    const removeItem = useCallback((index: number) => {
      if (items.length > 1) {
        const newItems: ChecklistItem[] = items.filter((_, i) => i !== index);
        
        setItems(newItems);
        onChange({ 
          ...block, 
          content: { 
            checklistItems: newItems,
            showProgress: showProgress
          } 
        });
      }
    }, [items, showProgress, block, onChange]);

    // Basculer l'affichage de la progression
    const toggleProgressDisplay = useCallback(() => {
      const newShowProgress = !showProgress;
      setShowProgress(newShowProgress);
      onChange({ 
        ...block, 
        content: { 
          checklistItems: items,
          showProgress: newShowProgress
        } 
      });
    }, [items, showProgress, block, onChange]);

    // NOUVEAU: Forcer la sauvegarde quand on perd le focus
    const handleInputBlur = useCallback((index: number) => {
      if (isTypingRef.current && saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        isTypingRef.current = false;
        onChange({ 
          ...block, 
          content: { 
            checklistItems: items,
            showProgress: showProgress
          } 
        });
      }
    }, [items, showProgress, block, onChange]);

    // Calculer les statistiques en excluant les éléments vides
    const nonEmptyItems = items.filter(item => item.text.trim() !== '');
    const totalItems = nonEmptyItems.length;
    const completedItems = nonEmptyItems.filter(item => item.checked).length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // NOUVEAU: Nettoyer le timer à la destruction du composant
    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="group relative">
        {/* Boutons de manipulation du bloc */}
        <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing hover:bg-accent"
              title="Déplacer"
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            {canMoveUp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
                title="Monter"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
            )}
            {canMoveDown && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveDown}
                className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
                title="Descendre"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="group space-y-4">
          {/* Header avec statistiques */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Liste de tâches</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {totalItems > 0 ? `${completedItems}/${totalItems} terminé${completedItems > 1 ? 's' : ''}` : 'Aucune tâche'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleProgressDisplay}
                className="h-8 px-2 text-xs cursor-pointer"
                title={showProgress ? "Masquer la progression" : "Afficher la progression"}
              >
                <Eye className="h-3 w-3 mr-1" />
                {showProgress ? "Masquer" : "Afficher"}
              </Button>
              {showProgress && (
                <>
                  <div className="text-xs font-medium text-muted-foreground">
                    {progress}%
                  </div>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Liste des éléments */}
          <div className="space-y-2 border border-border rounded-lg p-4 bg-background">
            {items.map((item: ChecklistItem, index: number) => (
              <div key={`item-${index}`} className="flex items-center gap-3 group/item p-2 rounded-md hover:bg-muted/30 transition-colors">
                {/* Checkbox moderne */}
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => updateItemChecked(index, e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className={`
                    w-5 h-5 rounded border-2 transition-all duration-200 cursor-pointer flex items-center justify-center
                    ${item.checked 
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm' 
                      : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'
                    }
                  `}
                  onClick={() => updateItemChecked(index, !item.checked)}
                  >
                    {item.checked && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* CORRECTION FINALE: Input qui ne sauvegarde QUE quand on arrête de taper */}
                <Input
                  value={item.text}
                  onChange={(e) => {
                    // SEULEMENT mettre à jour l'état local pendant la frappe
                    updateItemText(index, e.target.value);
                  }}
                  onBlur={() => {
                    // Sauvegarder quand on quitte le champ
                    handleInputBlur(index);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Forcer la sauvegarde avant d'ajouter un nouvel élément
                      if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                      }
                      onChange({ 
                        ...block, 
                        content: { 
                          checklistItems: items,
                          showProgress: showProgress
                        } 
                      });
                      
                      // Ajouter un nouvel élément si c'est le dernier et qu'il n'est pas vide
                      if (index === items.length - 1 && item.text.trim()) {
                        addItem();
                        // Focus sur le nouvel élément après un court délai
                        setTimeout(() => {
                          const inputs = document.querySelectorAll('input[placeholder^="Élément"]');
                          const nextInput = inputs[index + 1] as HTMLInputElement;
                          if (nextInput) {
                            nextInput.focus();
                          }
                        }, 100);
                      }
                    }
                  }}
                  placeholder={`Élément ${index + 1}...`}
                  className={`flex-1 border-none shadow-none focus-visible:ring-0 transition-all duration-200 ${
                    item.checked ? 'line-through text-muted-foreground opacity-75' : ''
                  }`}
                />

                {/* Bouton supprimer */}
                {items.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(index)}
                    className="opacity-0 group-hover/item:opacity-100 h-8 w-8 p-0 text-destructive hover:bg-destructive/10 cursor-pointer transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}

                {/* Indicateur de statut */}
                {item.text.trim() !== '' && (
                  <div className="opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.checked 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                    }`}>
                      {item.checked ? 'Terminé' : 'À faire'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bouton ajouter */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={addItem} 
            className="w-full cursor-pointer border-dashed hover:border-solid hover:bg-primary/5"
          >
            <Plus className="h-3 w-3 mr-2" />
            Ajouter un élément
          </Button>
        </div>
      </div>
    );
  };

  const renderBlock = (block: Block, index: number) => {
    const commonProps = {
      block,
      onChange: updateBlock,
      onDelete: () => deleteBlock(block.id),
      onMoveUp: () => moveBlock(block.id, 'up'),
      onMoveDown: () => moveBlock(block.id, 'down'),
      canMoveUp: index > 0,
      canMoveDown: index < blocks.length - 1
    };

    switch (block.type) {
      case 'text':
        return <TextBlock {...commonProps} />;
      case 'heading':
        return <HeadingBlock {...commonProps} />;
      case 'table':
        return <TableBlock {...commonProps} />;
      case 'checklist':
        return <ChecklistBlock {...commonProps} />;
      case 'quote':
        return <QuoteBlock {...commonProps} />;
      case 'code':
        return <CodeBlock {...commonProps} />;
      case 'image':
        return <ImageBlock {...commonProps} />;
      case 'file':
        return <FileBlock {...commonProps} />;
      case 'divider':
        return <DividerBlock {...commonProps} />;
      case 'spacer':
        return <SpacerBlock {...commonProps} />;
      default:
        return <TextBlock {...commonProps} />;
    }
  };

  // Composant pour le menu d'ajout de blocs
  const AddBlockMenu = ({ afterIndex }: { afterIndex?: number }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full opacity-0 group-hover:opacity-100 transition-opacity border-dashed hover:border-solid hover:bg-accent cursor-pointer"
          disabled={isAddingBlock}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isAddingBlock ? "Ajout en cours..." : "Ajouter un bloc"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-1 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('text', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
         
          >
            <Type className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Texte</div>
              <div className="text-xs text-muted-foreground">Paragraphe avec formatage</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('heading', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <Type className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Titre</div>
              <div className="text-xs text-muted-foreground">Titre de section</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('table', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <Table className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Tableau</div>
              <div className="text-xs text-muted-foreground">Tableau de données</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('checklist', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <CheckSquare className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Liste de tâches</div>
              <div className="text-xs text-muted-foreground">Cases à cocher</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('quote', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <Quote className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Citation</div>
              <div className="text-xs text-muted-foreground">Bloc de citation</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('code', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <Code className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Code</div>
              <div className="text-xs text-muted-foreground">Bloc de code</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('image', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <ImageIcon className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Image</div>
              <div className="text-xs text-muted-foreground">Image avec légende</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('divider', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <Minus className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Séparateur</div>
              <div className="text-xs text-muted-foreground">Ligne de séparation</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('spacer', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <MoveVertical className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Espacement</div>
              <div className="text-xs text-muted-foreground">Espace vertical</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('file', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
            disabled={isAddingBlock}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-left">
              <div className="font-medium">Fichier</div>
              <div className="text-xs text-muted-foreground">Vidéo, audio, document...</div>
            </div>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4 pl-6 relative">
      <div className="flex flex-col space-y-4 w-full">
        {blocks.length === 0 && (

          <div className="group block w-full">
            <AddBlockMenu />
          </div>
        )}
        
        {blocks.map((block, index) => (
          <div key={block.id} className="group block w-full">
            {renderBlock(block, index)}
            <div className="mt-3 w-full block">
              <AddBlockMenu afterIndex={index} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};