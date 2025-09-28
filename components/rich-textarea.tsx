"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bold, Italic, Strikethrough, Link, Palette, Code } from "lucide-react";

interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  minHeight?: string;
}

export function RichTextArea({ 
  value, 
  onChange, 
  placeholder = "Écrivez ici...", 
  className = "", 
  autoFocus = false,
  minHeight = "100px" 
}: RichTextAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<Range | null>(null);

  // Parse le texte avec formatage pour l'affichage
  const getFormattedHtml = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
      .replace(/\{\{color:(.*?)\|(.*?)\}\}/g, '<span style="color: $1;">$2</span>')
      .replace(/\n/g, '<br>');
  };

  // Capture le contenu éditable et convertit en markdown
  const handleBlur = () => {
    if (editorRef.current) {
      // Obtenir le HTML et le convertir en markdown
      const html = editorRef.current.innerHTML;
      // Convertir le HTML en markdown
      let markdown = html
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        .replace(/<em>(.*?)<\/em>/g, '*$1*')
        .replace(/<del>(.*?)<\/del>/g, '~~$1~~')
        .replace(/<code.*?>(.*?)<\/code>/g, '`$1`')
        .replace(/<a.*?href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)')
        .replace(/<span style="color: (.*?);">(.*?)<\/span>/g, '{{color:$1|$2}}')
        .replace(/<br\s*\/?>/g, '\n');
      
      // Nettoyer les restes de HTML
      markdown = markdown.replace(/<[^>]*>/g, '');
      
      onChange(markdown);
    }
  };

  // Pour gérer la sélection de texte
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '' && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (editorRef.current) {
        const editorRect = editorRef.current.getBoundingClientRect();
        setToolbarPosition({
          x: rect.left + rect.width/2 - editorRect.left,
          y: rect.top - editorRect.top - 10
        });
        setToolbarVisible(true);
        setSelection(range.cloneRange());
      }
    } else {
      setToolbarVisible(false);
    }
  };

  // Pour formatter le texte sélectionné
  const applyFormat = (format: string, value: string = '') => {
    if (!selection) return;
    
    // Restaurer la sélection
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(selection);
      
      // Appliquer le format
      document.execCommand('styleWithCSS', false, 'true');
      
      switch (format) {
        case 'bold':
          document.execCommand('bold', false);
          break;
        case 'italic':
          document.execCommand('italic', false);
          break;
        case 'strike':
          document.execCommand('strikeThrough', false);
          break;
        case 'code':
          // Entourer le texte sélectionné avec un élément <code>
          const codeElement = document.createElement('code');
          codeElement.className = 'bg-muted px-1 py-0.5 rounded text-xs';
          sel.getRangeAt(0).surroundContents(codeElement);
          break;
        case 'color':
          document.execCommand('foreColor', false, value);
          break;
        case 'link':
          const url = prompt('Entrez l\'URL:', 'https://');
          if (url) {
            document.execCommand('createLink', false, url);
            // Ajouter target et rel aux liens
            const links = editorRef.current?.querySelectorAll('a');
            links?.forEach(link => {
              link.setAttribute('target', '_blank');
              link.setAttribute('rel', 'noopener noreferrer');
              link.classList.add('text-primary', 'hover:underline');
            });
          }
          break;
      }
      
      // Mise à jour après formatage
      handleBlur();
    }
  };

  // Initialisation
  useEffect(() => {
    // Mettre à jour le contenu HTML formaté lors des changements de value
    if (editorRef.current && !editorRef.current.matches(':focus')) {
      editorRef.current.innerHTML = getFormattedHtml(value);
    }
  }, [value]);

  // Pour le focus initial
  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus();
      
      // Placer le curseur à la fin
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  return (
    <div className="relative">
      {/* Toolbar flottante */}
      {toolbarVisible && (
        <div 
          className="absolute z-50 bg-background border border-border rounded-md shadow-lg p-1 flex gap-1"
          style={{ 
            top: `${Math.max(0, toolbarPosition.y - 30)}px`, 
            left: `${toolbarPosition.x}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormat('bold')}
            className="h-7 w-7 p-1 cursor-pointer"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormat('italic')}
            className="h-7 w-7 p-1 cursor-pointer"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormat('strike')}
            className="h-7 w-7 p-1 cursor-pointer"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormat('code')}
            className="h-7 w-7 p-1 cursor-pointer"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => applyFormat('link')}
            className="h-7 w-7 p-1 cursor-pointer"
          >
            <Link className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-1 cursor-pointer">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-2 w-56">
              <div className="grid grid-cols-5 gap-1">
                {[
                  { name: 'Rouge',  value: '#ef4444' },
                  { name: 'Bleu',   value: '#3b82f6' },
                  { name: 'Vert',   value: '#10b981' },
                  { name: 'Jaune',  value: '#f59e0b' },
                  { name: 'Violet', value: '#8b5cf6' },
                  { name: 'Rose',   value: '#ec4899' },
                  { name: 'Orange', value: '#f97316' },
                  { name: 'Cyan',   value: '#06b6d4' },
                  { name: 'Gris',   value: '#6b7280' },
                  { name: 'Noir',   value: '#111827' },
                ].map((color) => (
                  <Button
                    key={color.name}
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormat('color', color.value)}
                    className="h-6 w-6 p-0 rounded-full border-2 border-white cursor-pointer"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Éditeur riche */}
      <div
        ref={editorRef}
        contentEditable
        dangerouslySetInnerHTML={{ __html: getFormattedHtml(value) }}
        onInput={() => {
          // Capture le contenu après modification par l'utilisateur

          handleBlur(); // Convertit en markdown et appelle onChange
        }}
        onBlur={handleBlur}
        onMouseUp={handleTextSelection}
        onKeyUp={handleTextSelection}
        className={`min-h-[${minHeight}] border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${className}`}
        style={{ 
          caretColor: 'currentColor',
          whiteSpace: 'pre-wrap'
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
