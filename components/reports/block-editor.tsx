"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadToDiscord } from "@/lib/discord-upload";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import {
  Type, 
  Table, 
  Code, 
  Quote, 
  CheckSquare,
  Image,
  Minus,
  Plus,
  GripVertical,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Hash,
  Palette,
  ChevronUp,
  ChevronDown,
  MoveVertical,
  Eye,
  List, // AJOUT: Import manquant de List
  ListOrdered // AJOUT: Import de ListOrdered aussi
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface Block {
  id: string;
  type: 'text' | 'heading' | 'list' | 'table' | 'image' | 'quote' | 'code' | 'divider' | 'checklist' | 'spacer';
  content: any;
  order: number;
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

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

// Composant d'éditeur de texte riche simplifié avec markdown visible
const RichTextArea = ({ value, onChange, placeholder, className = "", autoFocus = false, multiline = true, alignment = 'left', onAlignmentChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(value || '');
  const [isPreview, setIsPreview] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('recent');
  const [textAlignment, setTextAlignment] = useState(alignment || 'left'); // CORRIGÉ: Utiliser la prop alignment
  
  // Synchroniser avec la valeur externe - CORRIGÉ
  useEffect(() => {
    if (value !== content) {
      setContent(value || '');
    }
  }, [value]);

  // Parser le markdown en HTML pour l'aperçu - SUPPRESSION des couleurs
  const parseMarkdown = (text: string) => {
    if (!text) return '';
    
    let result = text;
    
    // Markdown SANS les couleurs
    result = result
      // Headers
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
      .replace(/^\* (.+)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.+)/gim, '<li class="ml-4">$1</li>')
      // Blockquotes
      .replace(/^> (.+)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground">$1</blockquote>')
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
                    : emojiCategories[activeEmojiCategory]?.emojis || []
                  ).map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      onClick={() => insertEmoji(emoji)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-md text-xl transition-colors cursor-pointer"
                      type="button"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
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

        {/* Toggle preview */}
        <Button 
          variant={isPreview ? "default" : "ghost"} 
          size="sm" 
          onClick={() => setIsPreview(!isPreview)} 
          className="h-8 w-8 p-1 cursor-pointer" 
          title="Aperçu"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {/* Éditeur / Aperçu */}
      {isPreview ? (
        <div 
          ref={previewRef}
          className={`min-h-[100px] w-full border rounded-md p-3 bg-background prose prose-sm max-w-none ${className}`}
          style={{ textAlign: textAlignment }} // AJOUT: Appliquer l'alignement à l'aperçu
          dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
        />
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder={placeholder}
            className={`min-h-[100px] w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-y bg-background font-mono text-sm ${className}`}
            style={{ 
              whiteSpace: "pre-wrap", 
              overflowWrap: "break-word",
              lineHeight: '1.5',
              overflow: 'hidden',
              textAlign: textAlignment // AJOUT: Appliquer l'alignement au textarea
            }}
            rows={1}
          />
        </div>
      )}
    </div>
  );
};

// Bloc de texte refait avec le nouvel éditeur - CORRECTION pour sauvegarder l'alignement
const TextBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.content?.text || block.content || '');
  const [alignment, setAlignment] = useState(block.content?.alignment || 'left'); // AJOUT: État pour l'alignement

  // Sauvegarder automatiquement - CORRIGÉ pour inclure l'alignement
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onChange({ 
      ...block, 
      content: { 
        text: newContent, 
        alignment: alignment 
      } 
    });
  };

  // AJOUT: Gérer les changements d'alignement
  const handleAlignmentChange = (newAlignment: string) => {
    setAlignment(newAlignment);
    onChange({ 
      ...block, 
      content: { 
        text: content, 
        alignment: newAlignment 
      } 
    });
  };

  const handleSave = () => {
    onChange({ 
      ...block, 
      content: { 
        text: content, 
        alignment: alignment 
      } 
    });
    setIsEditing(false);
  };

  // Parser le markdown pour l'affichage - CORRECTION: Vérifier que text est bien une chaîne
  const parseMarkdown = (text: string) => {
    // CORRECTION: S'assurer que text est une chaîne
    if (!text || typeof text !== 'string') return '';
    
    let result = text;
    
    // Markdown SANS les couleurs
    result = result
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
      .replace(/^\* (.+)/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.+)/gim, '<li class="ml-4">$1</li>')
      .replace(/^> (.+)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground">$1</blockquote>')
      .replace(/\n/g, '<br>');
      
    return result;
  };

  // CORRECTION: Initialiser les états à partir du contenu du bloc
  useEffect(() => {
    if (typeof block.content === 'object' && block.content !== null) {
      setContent(block.content.text || '');
      setAlignment(block.content.alignment || 'left');
    } else {
      // CORRECTION: S'assurer que block.content est une chaîne
      setContent(typeof block.content === 'string' ? block.content : '');
      setAlignment('left');
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
            value={content}
            onChange={handleContentChange}
            placeholder="Tapez votre texte avec support Markdown..."
            autoFocus={true}
            multiline={true}
            alignment={alignment}
            onAlignmentChange={handleAlignmentChange}
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
                  setContent(block.content.text || '');
                  setAlignment(block.content.alignment || 'left');
                } else {
                  setContent(typeof block.content === 'string' ? block.content : '');
                  setAlignment('left');
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
          style={{ textAlign: alignment }} // AJOUT: Appliquer l'alignement à l'affichage
        >
          {content ? (
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(content)
              }}
            />
          ) : (
            <span className="text-muted-foreground">Cliquez pour écrire avec support Markdown...</span>
          )}
        </div>
      )}
    </div>
  );
};

// NOUVEAU: Composant pour un bloc Quote séparé
const QuoteBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.content || '');

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    onChange({ ...block, content: newContent });
  };

  const handleSave = () => {
    onChange({ ...block, content: content });
    setIsEditing(false);
  };

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

// Composant pour un bloc d'image avec alignement et texte (AMÉLIORÉ)
const ImageBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => {
  const [isUploading, setIsUploading] = useState(false);
  const [alignment, setAlignment] = useState(block.content?.alignment || 'center');
  const [wrapText, setWrapText] = useState(block.content?.wrapText || '');
  const [caption, setCaption] = useState(block.content?.caption || '');
  const [additionalImages, setAdditionalImages] = useState(block.content?.additionalImages || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        updateContent('additionalImages', newAdditionalImages);
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

  const updateContent = (key: string, value: any) => {
    const newContent = { 
      ...block.content,
      [key]: value 
    };
    onChange({ 
      ...block, 
      content: newContent 
    });
  };

  const removeAdditionalImage = (index: number) => {
    const newAdditionalImages = additionalImages.filter((_: any, i: number) => i !== index);
    setAdditionalImages(newAdditionalImages);
    updateContent('additionalImages', newAdditionalImages);
  };

  const updateAdditionalImageCaption = (index: number, caption: string) => {
    const newAdditionalImages = [...additionalImages];
    newAdditionalImages[index].caption = caption;
    setAdditionalImages(newAdditionalImages);
    updateContent('additionalImages', newAdditionalImages);
  };

  useEffect(() => {
    if (block.content?.alignment !== alignment) {
      setAlignment(block.content?.alignment || 'center');
    }
    if (block.content?.wrapText !== wrapText) {
      setWrapText(block.content?.wrapText || '');
    }
    if (block.content?.caption !== caption) {
      setCaption(block.content?.caption || '');
    }
    if (block.content?.additionalImages !== additionalImages) {
      setAdditionalImages(block.content?.additionalImages || []);
    }
  }, [block.content]);

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
        {block.content?.src ? (
          <>
            {/* Contrôles d'alignement */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Alignement:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={alignment === 'left' ? 'default' : 'outline'}
                  onClick={() => {
                    setAlignment('left');
                    updateContent('alignment', 'left');
                  }}
                  className="cursor-pointer"
                >
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={alignment === 'center' ? 'default' : 'outline'}
                  onClick={() => {
                    setAlignment('center');
                    updateContent('alignment', 'center');
                  }}
                  className="cursor-pointer"
                >
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={alignment === 'right' ? 'default' : 'outline'}
                  onClick={() => {
                    setAlignment('right');
                    updateContent('alignment', 'right');
                  }}
                  className="cursor-pointer"
                >
                  <AlignRight className="h-3 w-3" />
                </Button>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => document.getElementById('additionalImageInput')?.click()}
                disabled={isUploading}
                className="cursor-pointer ml-auto"
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter une image
              </Button>
            </div>

            {/* Container d'image avec texte selon l'alignement */}
            <div className={`${
              alignment === 'center' ? 'space-y-4' : 'flex gap-4 items-start'
            }`}>
              {alignment === 'left' && (
                <>
                  <div className="flex-shrink-0 space-y-2">
                    <img 
                      src={block.content.src} 
                      alt={block.content.alt || ''} 
                      className="rounded-lg max-h-64 max-w-sm shadow-lg border border-border hover:shadow-xl transition-shadow duration-300"
                    />
                    {/* Images additionnelles */}
                    {additionalImages.map((img: any, index: number) => (
                      <div key={index} className="relative group/img">
                        <img 
                          src={img.src} 
                          alt={img.alt || ''} 
                          className="rounded-lg max-h-48 max-w-sm shadow-lg border border-border hover:shadow-xl transition-shadow duration-300"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 cursor-pointer"
                          onClick={() => removeAdditionalImage(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Textarea
                      value={wrapText}
                      onChange={(e) => {
                        setWrapText(e.target.value);
                        updateContent('wrapText', e.target.value);
                      }}
                      placeholder="Ajoutez du texte à côté de l'image..."
                      className="min-h-[200px] resize-none"
                    />
                  </div>
                </>
              )}

              {alignment === 'right' && (
                <>
                  <div className="flex-1 min-w-0">
                    <Textarea
                      value={wrapText}
                      onChange={(e) => {
                        setWrapText(e.target.value);
                        updateContent('wrapText', e.target.value);
                      }}
                      placeholder="Ajoutez du texte à côté de l'image..."
                      className="min-h-[200px] resize-none"
                    />
                  </div>
                  <div className="flex-shrink-0 space-y-2">
                    <img 
                      src={block.content.src} 
                      alt={block.content.alt || ''} 
                      className="rounded-lg max-h-64 max-w-sm shadow-lg border border-border hover:shadow-xl transition-shadow duration-300"
                    />
                    {/* Images additionnelles */}
                    {additionalImages.map((img: any, index: number) => (
                      <div key={index} className="relative group/img">
                        <img 
                          src={img.src} 
                          alt={img.alt || ''} 
                          className="rounded-lg max-h-48 max-w-sm shadow-lg border border-border hover:shadow-xl transition-shadow duration-300"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 cursor-pointer"
                          onClick={() => removeAdditionalImage(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {alignment === 'center' && (
                <div className="text-center space-y-4">
                  <img 
                    src={block.content.src} 
                    alt={block.content.alt || ''} 
                    className="rounded-lg max-h-96 shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 mx-auto"
                  />
                  
                  {/* Images additionnelles en grille */}
                  {additionalImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl mx-auto">
                      {additionalImages.map((img: any, index: number) => (
                        <div key={index} className="relative group/img">
                          <img 
                            src={img.src} 
                            alt={img.alt || ''} 
                            className="rounded-lg max-h-48 w-full object-cover shadow-lg border border-border hover:shadow-xl transition-shadow duration-300"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 cursor-pointer"
                            onClick={() => removeAdditionalImage(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {wrapText && (
                    <div className="w-full">
                      <Textarea
                        value={wrapText}
                        onChange={(e) => {
                          setWrapText(e.target.value);
                          updateContent('wrapText', e.target.value);
                        }}
                        placeholder="Texte sous l'image..."
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                  )}
                  {!wrapText && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWrapText('Ajoutez du texte...');
                        updateContent('wrapText', 'Ajoutez du texte...');
                      }}
                      className="cursor-pointer"
                    >
                      Ajouter du texte
                    </Button>
                  )}
                </div>
              )}
            </div>

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
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Upload en cours...</span>
              </div>
            ) : (
              <>
                <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cliquez pour ajouter une image</p>
              </>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file, false);
          }}
          className="hidden"
        />
        
        <input
          id="additionalImageInput"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file, true);
          }}
          className="hidden"
        />
      </div>
    </div>
  );
};

// CodeBlock avec éditeur amélioré
const CodeBlock = ({ block, onChange, onDelete }: any) => {
  const [content, setContent] = useState(block.content?.code || '');
  const [language, setLanguage] = useState(block.content?.language || 'javascript');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onChange({ ...block, content: { code: content, language } });
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
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
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
              {languages.map(lang => (
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
            {/* En-tête avec le langage */}
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
const HeadingBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => {
  const [content, setContent] = useState(block.content?.text || '');
  const [level, setLevel] = useState(block.content?.level || 1);
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
      
      <div className="flex items-center gap-3">
        <Select value={level.toString()} onValueChange={(value) => handleChange(content, parseInt(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1,2,3,4,5,6].map(h => (
              <SelectItem key={h} value={h.toString()}>H{h}</SelectItem>
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

// Composant pour une liste à cocher avec checkbox stylisée
const ChecklistBlock = ({ block, onChange, onDelete }: any) => {
  const [items, setItems] = useState(block.content || [{ text: '', checked: false }]);

  const updateItem = (index: number, text: string, checked?: boolean) => {
    const newItems = [...items];
    newItems[index] = { 
      text, 
      checked: checked !== undefined ? checked : newItems[index].checked 
    };
    setItems(newItems);
    onChange({ ...block, content: newItems });
  };

  const addItem = () => {
    const newItems = [...items, { text: '', checked: false }];
    setItems(newItems);
    onChange({ ...block, content: newItems });
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_: any, i: number) => i !== index);
      setItems(newItems);
      onChange({ ...block, content: newItems });
    }
  };

  return (
    <div className="group relative">
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 cursor-grab">
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-3 group/item">
            {/* Checkbox stylisée */}
            <div className="relative">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => updateItem(index, item.text, e.target.checked)}
                className="peer h-5 w-5 rounded border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
              />
              <svg
                className="absolute top-0.5 left-0.5 h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <Input
              value={item.text}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder="Élément de la liste..."
              className={`flex-1 border-none shadow-none focus-visible:ring-0 ${
                item.checked ? 'line-through text-muted-foreground' : ''
              }`}
            />
            {items.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeItem(index)}
                className="opacity-0 group-hover/item:opacity-100 h-6 w-6 p-0 text-destructive cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addItem} className="w-full cursor-pointer">
          <Plus className="h-3 w-3 mr-1" />
          Ajouter un élément
        </Button>
      </div>
    </div>
  );
};

// Mise à jour du TableBlock avec sauvegarde automatique
const TableBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => {
  const [data, setData] = useState(block.content || { 
    headers: ['Colonne 1', 'Colonne 2'], 
    rows: [['', ''], ['', '']] 
  });
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [tempCellValue, setTempCellValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Parser markdown simple pour les cellules - SUPPRESSION des couleurs
  const parseMarkdown = (text: string) => {
    if (!text) return text;
    
    let result = text;
    
    // Markdown SANS les couleurs
    result = result
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
      
    return result;
  };

  // MODIFICATION: Démarrer l'édition d'une cellule
  const startEditing = (rowIndex: number, colIndex: number, isHeader = false) => {
    const currentValue = isHeader ? data.headers[colIndex] : data.rows[rowIndex][colIndex];
    setTempCellValue(currentValue);
    setEditingCell({ row: isHeader ? -1 : rowIndex, col: colIndex });
  };

  // AJOUT: Sauvegarder automatiquement les modifications
  const saveCell = useCallback(() => {
    if (!editingCell) return;
    
    const newData = { ...data };
    if (editingCell.row === -1) {
      // En-tête
      newData.headers[editingCell.col] = tempCellValue;
    } else {
      // Cellule normale
      newData.rows[editingCell.row][editingCell.col] = tempCellValue;
    }
    
    setData(newData);
    onChange({ ...block, content: newData });
    setEditingCell(null);
    setTempCellValue('');
  }, [editingCell, tempCellValue, data, block, onChange]);

  // AJOUT: Gérer la perte de focus pour sauvegarder
  const handleBlur = useCallback(() => {
    // Petit délai pour permettre aux clics sur d'autres éléments de se déclencher
    setTimeout(() => {
      saveCell();
    }, 150);
  }, [saveCell]);

  // AJOUT: Gérer les touches clavier
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      saveCell();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempCellValue('');
    }
  }, [saveCell]);

  // AJOUT: Auto-focus quand on commence à éditer
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const addRow = () => {
    const newData = { ...data };
    newData.rows.push(new Array(data.headers.length).fill(''));
    setData(newData);
    onChange({ ...block, content: newData });
  };

  const addColumn = () => {
    const newData = { ...data };
    newData.headers.push(`Colonne ${newData.headers.length + 1}`);
    newData.rows = newData.rows.map(row => [...row, '']);
    setData(newData);
    onChange({ ...block, content: newData });
  };

  const removeRow = (index: number) => {
    if (data.rows.length > 1) {
      const newData = { ...data };
      newData.rows.splice(index, 1);
      setData(newData);
      onChange({ ...block, content: newData });
    }
  };

  const removeColumn = (index: number) => {
    if (data.headers.length > 1) {
      const newData = { ...data };
      newData.headers.splice(index, 1);
      newData.rows = newData.rows.map(row => {
        const newRow = [...row];
        newRow.splice(index, 1);
        return newRow;
      });
      setData(newData);
      onChange({ ...block, content: newData });
    }
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

      <div className="space-y-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow} className="cursor-pointer">
            <Plus className="h-3 w-3 mr-1" />
            Ligne
          </Button>
          <Button size="sm" variant="outline" onClick={addColumn} className="cursor-pointer">
            <Plus className="h-3 w-3 mr-1" />
            Colonne
          </Button>
        </div>
        
        {/* Tableau avec sauvegarde automatique */}
        <div className="w-full overflow-hidden rounded-lg border border-border bg-background shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {data.headers.map((header: string, colIndex: number) => (
                  <th key={colIndex} className="relative group/cell border-r border-border last:border-r-0">
                    {editingCell?.row === -1 && editingCell?.col === colIndex ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={tempCellValue}
                        onChange={(e) => setTempCellValue(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-3 bg-transparent border-none outline-none font-semibold"
                        placeholder="En-tête..."
                      />
                    ) : (
                      <div
                        onClick={() => startEditing(-1, colIndex, true)}
                        className="px-4 py-3 font-semibold cursor-text min-h-[40px] flex items-center hover:bg-muted/30 transition-colors"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(header) }}
                      />
                    )}
                    {data.headers.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeColumn(colIndex)}
                        className="absolute -top-2 -right-2 h-5 w-5 p-0 opacity-0 group-hover/cell:opacity-100 transition-opacity bg-destructive text-destructive-foreground hover:bg-destructive/80 z-10 cursor-pointer"
                      >
                        <Trash2 className="h-2 w-2" />
                      </Button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row: string[], rowIndex: number) => (
                <tr key={rowIndex} className="group/row hover:bg-muted/20 border-b border-border last:border-b-0">
                  {row.map((cell: string, colIndex: number) => (
                    <td key={colIndex} className="border-r border-border last:border-r-0 relative">
                      {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={tempCellValue}
                          onChange={(e) => setTempCellValue(e.target.value)}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          className="w-full px-4 py-3 bg-transparent border-none outline-none"
                          placeholder="..."
                        />
                      ) : (
                        <div
                          onClick={() => startEditing(rowIndex, colIndex)}
                          className="px-4 py-3 cursor-text min-h-[40px] flex items-center hover:bg-muted/30 transition-colors"
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(cell) }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Ligne pour ajouter une nouvelle ligne */}
              <tr>
                <td colSpan={data.headers.length} className="border-t border-border">
                  <Button
                    onClick={addRow}
                    variant="outline"
                    size="sm"
                    className="w-full h-10 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une ligne
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* Boutons de suppression de ligne */}
          {data.rows.length > 1 && (
            <div className="bg-muted/10 border-t border-border p-2">
              <div className="flex gap-1 flex-wrap">
                {data.rows.map((_, rowIndex) => (
                  <Button
                    key={`delete-row-${rowIndex}`}
                    size="sm"
                    variant="outline"
                    onClick={() => removeRow(rowIndex)}
                    className="h-6 px-2 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                  >
                    Supprimer ligne {rowIndex + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant pour un séparateur
const DividerBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => {
  return (
    <div className="group relative">
      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing hover:bg-accent"
            title="Déplacer"
            draggable
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
            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <hr className="border-t-2 border-border my-6" />
    </div>
  );
};

// Corrigé: Nouveau composant pour le bloc d'espacement (correction du problème [object Object])
const SpacerBlock = ({ block, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: any) => {
  // Assurer que height soit initialisé comme un nombre
  const initialHeight = typeof block.content === 'object' && block.content !== null && typeof block.content.height === 'number' 
    ? block.content.height 
    : 40;
  
  const [height, setHeight] = useState(initialHeight);
  
  const handleHeightChange = (newHeight: number[]) => {
    if (Array.isArray(newHeight) && newHeight.length > 0) {
      const value = newHeight[0];
      setHeight(value);
      // S'assurer que la valeur passée est un objet avec une propriété height de type number
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
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 cursor-grab"
            title="Déplacer"
            draggable
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
            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
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
          
          {/* Aperçu visuel de l'espacement */}
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
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  
  // SUPPRESSION des états pour la toolbar globale qui causent des problèmes
  // Les sélections seront traitées uniquement dans RichTextArea
  
  const addBlock = (type: Block['type'], afterIndex?: number) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type),
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
  };

  const getDefaultContent = (type: Block['type']) => {
    switch (type) {
      case 'heading': return { text: '', level: 1 };
      case 'table': return { headers: ['Colonne 1', 'Colonne 2'], rows: [['', ''], ['', '']] };
      case 'checklist': return [{ text: '', checked: false }];
      case 'list': return [''];
      case 'quote': return '';
      case 'code': return { code: '', language: 'javascript' };
      case 'image': return { src: '', alt: '', caption: '' };
      case 'divider': return null;
      case 'spacer': return { height: 40 };
      default: return { text: '', alignment: 'left' }; // CORRECTION: Contenu par défaut avec alignement
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
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un bloc
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-1 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('text', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
          >
            <Type className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Texte</div>
              <div className="text-xs text-muted-foreground">Paragraphe de texte</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('heading', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
          >
            <Type className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Titre</div>
              <div className="text-xs text-muted-foreground">H1, H2, H3...</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('table', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
          >
            <Table className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Tableau</div>
              <div className="text-xs text-muted-foreground">Données tabulaires</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('checklist', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
          >
            <CheckSquare className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Liste</div>
              <div className="text-xs text-muted-foreground">À cocher</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('quote', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
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
          >
            <Image className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Image</div>
              <div className="text-xs text-muted-foreground">Ajouter une image</div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addBlock('divider', afterIndex)}
            className="flex items-center gap-3 justify-start h-auto p-3 hover:bg-accent cursor-pointer"
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
          >
            <MoveVertical className="h-4 w-4" />
            <div className="text-left">
              <div className="font-medium">Espacement</div>
              <div className="text-xs text-muted-foreground">Espace vertical invisible</div>
            </div>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4 pl-6 relative"> {/* Réduit l'espace à gauche de 12 à 6 */}
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
}