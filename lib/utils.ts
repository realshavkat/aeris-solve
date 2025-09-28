import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// AJOUT: Fonction utilitaire pour parser le markdown avec support des couleurs
export function parseMarkdownForPreview(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // D'abord traiter les couleurs avant tout le reste
  result = result.replace(/\{color\s*:\s*(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})\s*,\s*"([^"]*?)"\s*\}/gi, '<span style="color: $1;">$2</span>');
  
  // Puis le reste du markdown de base
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
