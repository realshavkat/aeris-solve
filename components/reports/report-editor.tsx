"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from "next-auth/react"; // AJOUT DE L'IMPORT MANQUANT
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Bold, 
  Italic, 
  Strikethrough,
  List, // Ajout de l'import manquant
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Palette,
  Tag as TagIcon,
  Save,
  Eye,
  ArrowLeft,
  Smile,
  Edit3,
  X,
  Check
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadToDiscord } from "@/lib/discord-upload";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { BlockEditor, Block } from "./block-editor";

// New imports for client-side only components
import dynamic from 'next/dynamic';

// Create client-only versions of the popover components
const ClientSidePopover = ({ children, ...props }) => {
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

// Remplacer le tableau d'emojis par une version beaucoup plus complète
const emojiCategories = [
  {
    id: 'smileys',
    title: "😊 Visages & Émotions",
    emojis: [
      { emoji: "😀", keywords: ["sourire", "heureux", "joie"] },
      { emoji: "😃", keywords: ["sourire", "heureux", "joie"] },
      { emoji: "😄", keywords: ["sourire", "rire", "heureux"] },
      { emoji: "😁", keywords: ["sourire", "rire", "joie"] },
      { emoji: "😅", keywords: ["sourire", "sueur", "gêné"] },
      { emoji: "😂", keywords: ["rire", "pleurs", "mdr", "lol"] },
      { emoji: "🤣", keywords: ["rire", "mort", "hilarant"] },
      { emoji: "😊", keywords: ["sourire", "heureux", "content"] },
      { emoji: "😇", keywords: ["ange", "innocent", "sage"] },
      { emoji: "🙂", keywords: ["sourire", "léger", "content"] },
      { emoji: "🙃", keywords: ["sourire", "inversé", "ironique"] },
      { emoji: "😉", keywords: ["clin d'œil", "complicité"] },
      { emoji: "😌", keywords: ["soulagé", "paisible", "zen"] },
      { emoji: "😍", keywords: ["amour", "cœur", "amoureux"] },
      { emoji: "🥰", keywords: ["amour", "cœur", "adorable"] },
      { emoji: "😘", keywords: ["bisou", "baiser", "amour"] },
      { emoji: "😗", keywords: ["bisou", "baiser"] },
      { emoji: "😙", keywords: ["bisou", "sourire"] },
      { emoji: "😚", keywords: ["bisou", "fermé"] },
      { emoji: "😋", keywords: ["délicieux", "savourer"] },
      { emoji: "😛", keywords: ["langue", "taquin"] },
      { emoji: "😝", keywords: ["langue", "clin d'œil", "taquin"] },
      { emoji: "😜", keywords: ["langue", "clin d'œil", "fou"] },
      { emoji: "🤪", keywords: ["fou", "dingue", "bizarre"] },
      { emoji: "🤨", keywords: ["soupçonneux", "sceptique"] },
      { emoji: "🧐", keywords: ["monocle", "curieux", "inspecter"] },
      { emoji: "🤓", keywords: ["nerd", "lunettes", "intelligent"] },
      { emoji: "😎", keywords: ["cool", "lunettes", "soleil"] },
      { emoji: "🤩", keywords: ["étoiles", "impressionné", "wow"] },
      { emoji: "🥳", keywords: ["fête", "célébration", "party"] },
      { emoji: "😏", keywords: ["sourire en coin", "narquois"] },
      { emoji: "😒", keywords: ["mécontent", "blasé"] },
      { emoji: "😞", keywords: ["déçu", "triste"] },
      { emoji: "😔", keywords: ["pensif", "triste"] },
      { emoji: "😟", keywords: ["inquiet", "soucieux"] },
      { emoji: "😕", keywords: ["perplexe", "confus"] },
      { emoji: "🙁", keywords: ["légèrement triste", "déçu"] },
      { emoji: "☹️", keywords: ["triste", "malheureux"] },
      { emoji: "😣", keywords: ["persévérant", "difficile"] },
      { emoji: "😖", keywords: ["confus", "troublé"] },
      { emoji: "😫", keywords: ["fatigué", "épuisé"] },
      { emoji: "😩", keywords: ["fatigué", "épuisé"] },
      { emoji: "🥺", keywords: ["suppliant", "mignon", "yeux"] },
      { emoji: "😢", keywords: ["pleurs", "triste", "larme"] },
      { emoji: "😭", keywords: ["pleurs", "sanglot", "triste"] },
      { emoji: "😤", keywords: ["triomphant", "fier"] },
      { emoji: "😠", keywords: ["fâché", "colère"] },
      { emoji: "😡", keywords: ["enragé", "furieux"] },
      { emoji: "🤬", keywords: ["jurons", "gros mots", "furieux"] },
      { emoji: "🤯", keywords: ["tête qui explose", "choc"] },
      { emoji: "😳", keywords: ["rougir", "gêné", "surpris"] },
      { emoji: "🥵", keywords: ["chaud", "transpirant"] },
      { emoji: "🥶", keywords: ["froid", "gelé"] },
      { emoji: "😱", keywords: ["crier", "terreur", "horreur"] },
      { emoji: "😨", keywords: ["peur", "effrayé"] },
      { emoji: "😰", keywords: ["peur", "sueur froide"] },
      { emoji: "😥", keywords: ["déçu", "soulagé"] },
      { emoji: "😓", keywords: ["sueur froide", "échec"] },
      { emoji: "🤗", keywords: ["câlin", "accolade"] },
      { emoji: "🤔", keywords: ["pensif", "réfléchir"] },
      { emoji: "🤭", keywords: ["main sur bouche", "surprise"] },
      { emoji: "🤫", keywords: ["chut", "silence"] },
      { emoji: "🤥", keywords: ["menteur", "pinocchio"] },
      { emoji: "😶", keywords: ["sans bouche", "silencieux"] },
      { emoji: "😐", keywords: ["neutre", "indifférent"] },
      { emoji: "😑", keywords: ["sans expression", "indifférent"] },
      { emoji: "😬", keywords: ["grimace", "malaise"] },
      { emoji: "🙄", keywords: ["lever les yeux", "exaspéré"] },
      { emoji: "😯", keywords: ["surpris", "étonné"] },
      { emoji: "😦", keywords: ["inquiet", "bouche ouverte"] },
      { emoji: "😧", keywords: ["angoissé", "peiné"] },
      { emoji: "😮", keywords: ["bouche ouverte", "surpris"] }
    ]
  },
  {
    id: 'people',
    title: "👤 Personnes & Corps",
    emojis: [
      { emoji: "👋", keywords: ["salut", "bonjour", "au revoir"] },
      { emoji: "🤚", keywords: ["main", "stop", "arrêt"] },
      { emoji: "🖐", keywords: ["main", "cinq", "stop"] },
      { emoji: "✋", keywords: ["main", "stop", "arrêt"] },
      { emoji: "🖖", keywords: ["spock", "vulcain", "star trek"] },
      { emoji: "👌", keywords: ["ok", "parfait", "bien"] },
      { emoji: "🤌", keywords: ["italien", "pincer"] },
      { emoji: "🤏", keywords: ["petit", "pincer"] },
      { emoji: "✌️", keywords: ["paix", "victoire", "deux"] },
      { emoji: "🤞", keywords: ["croiser", "chance", "espoir"] },
      { emoji: "🫰", keywords: ["cœur", "amour", "coréen"] },
      { emoji: "🤟", keywords: ["amour", "you", "rock"] },
      { emoji: "🤘", keywords: ["rock", "metal", "cornes"] },
      { emoji: "🤙", keywords: ["appeler", "téléphone", "surf"] },
      { emoji: "👈", keywords: ["pointer", "gauche"] },
      { emoji: "👉", keywords: ["pointer", "droite"] },
      { emoji: "👆", keywords: ["pointer", "haut"] },
      { emoji: "👇", keywords: ["pointer", "bas"] },
      { emoji: "☝️", keywords: ["un", "attention"] },
      { emoji: "👍", keywords: ["pouce", "bien", "top"] },
      { emoji: "👎", keywords: ["pouce", "mal", "non"] },
      { emoji: "✊", keywords: ["poing", "résistance"] },
      { emoji: "👊", keywords: ["poing", "coup"] },
      { emoji: "🤛", keywords: ["poing", "gauche"] },
      { emoji: "🤜", keywords: ["poing", "droite"] },
      { emoji: "👏", keywords: ["applaudir", "bravo"] },
      { emoji: "🙌", keywords: ["hourra", "lever les mains"] },
      { emoji: "👐", keywords: ["mains ouvertes", "accueil"] },
      { emoji: "🤲", keywords: ["prier", "supplier"] },
      { emoji: "🤝", keywords: ["poignée de main", "accord"] },
      { emoji: "🙏", keywords: ["prier", "s'il vous plaît", "merci"] },
      { emoji: "✍️", keywords: ["écrire", "main"] },
      { emoji: "💪", keywords: ["biceps", "fort", "muscle"] },
      { emoji: "🦾", keywords: ["bras mécanique", "prothèse"] },
      { emoji: "🦿", keywords: ["jambe mécanique", "prothèse"] },
      { emoji: "🦵", keywords: ["jambe", "coup de pied"] },
      { emoji: "🦶", keywords: ["pied", "pas"] },
      { emoji: "👂", keywords: ["oreille", "écouter"] },
      { emoji: "🦻", keywords: ["oreille", "appareil auditif"] },
      { emoji: "👃", keywords: ["nez", "sentir"] },
      { emoji: "👣", keywords: ["empreintes", "pas"] },
      { emoji: "👀", keywords: ["yeux", "regarder"] },
      { emoji: "👁️", keywords: ["œil", "regarder"] },
      { emoji: "👅", keywords: ["langue", "goûter"] },
      { emoji: "👄", keywords: ["bouche", "lèvres"] },
      { emoji: "💋", keywords: ["baiser", "bisou", "lèvres"] },
      { emoji: "🫦", keywords: ["lèvre mordue", "séduction"] },
      { emoji: "🧠", keywords: ["cerveau", "intelligence"] },
      { emoji: "🫀", keywords: ["cœur", "anatomie"] },
      { emoji: "🫁", keywords: ["poumons", "respirer"] },
      { emoji: "🦷", keywords: ["dent", "dentiste"] },
      { emoji: "🦴", keywords: ["os", "squelette"] },
      { emoji: "👶", keywords: ["bébé", "enfant"] },
      { emoji: "🧒", keywords: ["enfant", "jeune"] },
      { emoji: "👦", keywords: ["garçon", "jeune"] },
      { emoji: "👧", keywords: ["fille", "jeune"] },
      { emoji: "👱", keywords: ["blond", "cheveux"] },
      { emoji: "👨", keywords: ["homme", "personne"] },
      { emoji: "🧔", keywords: ["barbe", "homme"] },
      { emoji: "👩", keywords: ["femme", "personne"] }
    ]
  },
  {
    id: 'gestures',
    title: "🫡 Gestes & Actions",
    emojis: [
      { emoji: "🫡", keywords: ["salut", "militaire"] },
      { emoji: "💁", keywords: ["aide", "information"] },
      { emoji: "🙋", keywords: ["lever la main", "question"] },
      { emoji: "🧏", keywords: ["sourd", "malentendant"] },
      { emoji: "🙇", keywords: ["s'incliner", "révérence"] },
      { emoji: "🤦", keywords: ["facepalm", "désespoir"] },
      { emoji: "🤷", keywords: ["haussement d'épaules", "je ne sais pas"] },
      { emoji: "🧎", keywords: ["s'agenouiller", "genou"] },
      { emoji: "🧍", keywords: ["debout", "personne"] },
      { emoji: "🧑‍🦯", keywords: ["aveugle", "canne blanche"] },
      { emoji: "👨‍🦯", keywords: ["homme aveugle", "canne blanche"] },
      { emoji: "👩‍🦯", keywords: ["femme aveugle", "canne blanche"] },
      { emoji: "🧑‍🦼", keywords: ["fauteuil roulant", "motorisé"] },
      { emoji: "👨‍🦼", keywords: ["homme", "fauteuil roulant motorisé"] },
      { emoji: "👩‍🦼", keywords: ["femme", "fauteuil roulant motorisé"] },
      { emoji: "🧑‍🦽", keywords: ["fauteuil roulant", "manuel"] },
      { emoji: "👨‍🦽", keywords: ["homme", "fauteuil roulant manuel"] },
      { emoji: "👩‍🦽", keywords: ["femme", "fauteuil roulant manuel"] },
      { emoji: "🏃", keywords: ["courir", "course"] },
      { emoji: "💃", keywords: ["danseuse", "danse"] },
      { emoji: "🕺", keywords: ["danseur", "danse"] },
      { emoji: "🕴️", keywords: ["homme d'affaires", "lévitation"] },
      { emoji: "👯", keywords: ["danseurs", "fête"] },
      { emoji: "🧖", keywords: ["sauna", "vapeur"] },
      { emoji: "🧗", keywords: ["escalade", "grimper"] }
    ]
  },
  {
    id: 'animals',
    title: "🐾 Animaux & Nature",
    emojis: [
      { emoji: "🐶", keywords: ["chien", "animal", "compagnie"] },
      { emoji: "🐱", keywords: ["chat", "animal", "mignon"] },
      { emoji: "🐭", keywords: ["souris", "petit", "animal"] },
      { emoji: "🐹", keywords: ["hamster", "animal", "rongeur"] },
      { emoji: "🐰", keywords: ["lapin", "animal", "mignon"] },
      { emoji: "🦊", keywords: ["renard", "animal", "roux"] },
      { emoji: "🐻", keywords: ["ours", "animal", "fort"] },
      { emoji: "🐼", keywords: ["panda", "animal", "chine"] },
      { emoji: "🐨", keywords: ["koala", "animal", "australie"] },
      { emoji: "🐯", keywords: ["tigre", "animal", "rayé"] },
      { emoji: "🦁", keywords: ["lion", "animal", "roi"] },
      { emoji: "🐮", keywords: ["vache", "animal", "ferme"] },
      { emoji: "🐷", keywords: ["cochon", "animal", "ferme"] },
      { emoji: "🐸", keywords: ["grenouille", "animal", "vert"] },
      { emoji: "🐵", keywords: ["singe", "animal", "primate"] },
      { emoji: "🙈", keywords: ["singe", "ne pas voir"] },
      { emoji: "🙉", keywords: ["singe", "ne pas entendre"] },
      { emoji: "🙊", keywords: ["singe", "ne pas parler"] },
      { emoji: "🐒", keywords: ["singe", "animal"] },
      { emoji: "🐔", keywords: ["poule", "ferme"] },
      { emoji: "🐧", keywords: ["pingouin", "froid"] },
      { emoji: "🐦", keywords: ["oiseau", "voler"] },
      { emoji: "🐤", keywords: ["poussin", "bébé"] },
      { emoji: "🐣", keywords: ["éclosion", "poussin"] },
      { emoji: "🐥", keywords: ["poussin", "face"] },
      { emoji: "🦆", keywords: ["canard", "oiseau"] },
      { emoji: "🦅", keywords: ["aigle", "oiseau"] },
      { emoji: "🦉", keywords: ["hibou", "nuit"] },
      { emoji: "🦇", keywords: ["chauve-souris", "nuit"] },
      { emoji: "🐺", keywords: ["loup", "animal"] },
      { emoji: "🐗", keywords: ["sanglier", "forêt"] },
      { emoji: "🐴", keywords: ["cheval", "animal"] },
      { emoji: "🦄", keywords: ["licorne", "fantaisie"] },
      { emoji: "🐝", keywords: ["abeille", "miel"] },
      { emoji: "🪱", keywords: ["ver", "sol"] },
      { emoji: "🐛", keywords: ["chenille", "insecte"] },
      { emoji: "🦋", keywords: ["papillon", "insecte"] },
      { emoji: "🐌", keywords: ["escargot", "lent"] },
      { emoji: "🐞", keywords: ["coccinelle", "insecte"] },
      { emoji: "🐜", keywords: ["fourmi", "insecte"] },
      { emoji: "🪰", keywords: ["mouche", "insecte"] },
      { emoji: "🪲", keywords: ["coléoptère", "insecte"] },
      { emoji: "🪳", keywords: ["cafard", "insecte"] },
      { emoji: "🦟", keywords: ["moustique", "insecte"] },
      { emoji: "🦗", keywords: ["cricket", "insecte"] },
      { emoji: "🕷", keywords: ["araignée", "insecte"] },
      { emoji: "🕸", keywords: ["toile", "araignée"] },
      { emoji: "🦂", keywords: ["scorpion", "piqûre"] },
      { emoji: "🐢", keywords: ["tortue", "lent"] },
      { emoji: "🐍", keywords: ["serpent", "reptile"] },
      { emoji: "🦎", keywords: ["lézard", "reptile"] },
      { emoji: "🦖", keywords: ["t-rex", "dinosaure"] },
      { emoji: "🦕", keywords: ["sauropode", "dinosaure"] },
      { emoji: "🐙", keywords: ["pieuvre", "mer"] },
      { emoji: "🦑", keywords: ["calmar", "mer"] }
    ]
  },
  {
    id: 'nature',
    title: "🌿 Nature & Plantes",
    emojis: [
      { emoji: "🌸", keywords: ["fleur", "cerisier"] },
      { emoji: "💮", keywords: ["fleur", "blanche"] },
      { emoji: "🏵️", keywords: ["rosette", "fleur"] },
      { emoji: "🌹", keywords: ["rose", "fleur"] },
      { emoji: "🥀", keywords: ["fleur fanée", "mort"] },
      { emoji: "🌺", keywords: ["hibiscus", "fleur"] },
      { emoji: "🌻", keywords: ["tournesol", "fleur"] },
      { emoji: "🌼", keywords: ["fleur", "floraison"] },
      { emoji: "🌷", keywords: ["tulipe", "fleur"] },
      { emoji: "🌱", keywords: ["pousse", "jeune"] },
      { emoji: "🪴", keywords: ["plante en pot", "intérieur"] },
      { emoji: "🌲", keywords: ["arbre", "sapin"] },
      { emoji: "🌳", keywords: ["arbre", "feuillu"] },
      { emoji: "🌴", keywords: ["palmier", "tropical"] },
      { emoji: "🌵", keywords: ["cactus", "désert"] },
      { emoji: "🌾", keywords: ["riz", "céréale"] },
      { emoji: "🌿", keywords: ["herbe", "plante"] },
      { emoji: "☘️", keywords: ["trèfle", "irlande"] },
      { emoji: "🍀", keywords: ["trèfle", "chance"] },
      { emoji: "🍁", keywords: ["feuille", "érable"] },
      { emoji: "🍂", keywords: ["feuille", "automne"] },
      { emoji: "🍃", keywords: ["feuille", "vent"] },
      { emoji: "🍄", keywords: ["champignon", "forêt"] },
      { emoji: "🪨", keywords: ["roche", "pierre"] },
      { emoji: "🪵", keywords: ["bois", "bûche"] },
      { emoji: "🌑", keywords: ["nouvelle lune", "nuit"] },
      { emoji: "🌒", keywords: ["premier croissant", "lune"] },
      { emoji: "🌓", keywords: ["premier quartier", "lune"] },
      { emoji: "🌔", keywords: ["gibbeuse croissante", "lune"] },
      { emoji: "🌕", keywords: ["pleine lune", "nuit"] },
      { emoji: "🌖", keywords: ["gibbeuse décroissante", "lune"] },
      { emoji: "🌗", keywords: ["dernier quartier", "lune"] },
      { emoji: "🌘", keywords: ["dernier croissant", "lune"] },
      { emoji: "🌙", keywords: ["croissant de lune", "nuit"] },
      { emoji: "🌚", keywords: ["nouvelle lune", "visage"] },
      { emoji: "🌛", keywords: ["premier quartier", "visage"] },
      { emoji: "🌜", keywords: ["dernier quartier", "visage"] },
      { emoji: "☀️", keywords: ["soleil", "chaud"] },
      { emoji: "🌝", keywords: ["pleine lune", "visage"] },
      { emoji: "🌞", keywords: ["soleil", "visage"] },
      { emoji: "🪐", keywords: ["saturne", "planète"] },
      { emoji: "⭐", keywords: ["étoile", "brillant"] },
      { emoji: "🌟", keywords: ["étoile", "brillante"] },
      { emoji: "🌠", keywords: ["étoile filante", "vœu"] },
      { emoji: "🌌", keywords: ["voie lactée", "étoiles"] },
      { emoji: "☁️", keywords: ["nuage", "temps"] },
      { emoji: "⛅", keywords: ["nuage", "soleil"] },
      { emoji: "⛈️", keywords: ["nuage", "orage"] },
      { emoji: "🌤️", keywords: ["soleil", "nuage"] },
      { emoji: "🌥️", keywords: ["soleil", "grand nuage"] },
      { emoji: "🌦️", keywords: ["soleil", "pluie"] }
    ]
  },
  {
    id: 'food',
    title: "🍎 Nourriture & Boissons",
    emojis: [
      { emoji: "🍎", keywords: ["pomme", "fruit", "rouge"] },
      { emoji: "🍏", keywords: ["pomme", "fruit", "vert"] },
      { emoji: "🍐", keywords: ["poire", "fruit"] },
      { emoji: "🍊", keywords: ["orange", "fruit", "agrume"] },
      { emoji: "🍋", keywords: ["citron", "fruit", "agrume"] },
      { emoji: "🍌", keywords: ["banane", "fruit", "jaune"] },
      { emoji: "🍉", keywords: ["pastèque", "fruit", "rouge"] },
      { emoji: "🍇", keywords: ["raisin", "fruit", "violet"] },
      { emoji: "🍓", keywords: ["fraise", "fruit", "rouge"] },
      { emoji: "🫐", keywords: ["myrtilles", "fruit", "bleu"] },
      { emoji: "🍈", keywords: ["melon", "fruit"] },
      { emoji: "🍒", keywords: ["cerise", "fruit", "rouge"] },
      { emoji: "🍑", keywords: ["pêche", "fruit"] },
      { emoji: "🥭", keywords: ["mangue", "fruit", "tropical"] },
      { emoji: "🍍", keywords: ["ananas", "fruit", "tropical"] },
      { emoji: "🥥", keywords: ["noix de coco", "fruit", "tropical"] },
      { emoji: "🥝", keywords: ["kiwi", "fruit", "vert"] },
      { emoji: "🍅", keywords: ["tomate", "fruit", "légume"] },
      { emoji: "🍆", keywords: ["aubergine", "légume"] },
      { emoji: "🥑", keywords: ["avocat", "fruit"] },
      { emoji: "🥦", keywords: ["brocoli", "légume"] },
      { emoji: "🥬", keywords: ["légume", "vert", "feuille"] },
      { emoji: "🥒", keywords: ["concombre", "légume"] },
      { emoji: "🌶", keywords: ["piment", "épicé"] },
      { emoji: "🫑", keywords: ["poivron", "légume"] },
      { emoji: "🌽", keywords: ["maïs", "légume"] },
      { emoji: "🥕", keywords: ["carotte", "légume"] },
      { emoji: "🫒", keywords: ["olive", "fruit"] },
      { emoji: "🧄", keywords: ["ail", "épice"] },
      { emoji: "🧅", keywords: ["oignon", "légume"] },
      { emoji: "🥔", keywords: ["pomme de terre", "légume"] },
      { emoji: "🍠", keywords: ["patate douce", "légume"] },
      { emoji: "🥐", keywords: ["croissant", "pâtisserie"] },
      { emoji: "🥖", keywords: ["baguette", "pain"] },
      { emoji: "🍞", keywords: ["pain", "mie"] },
      { emoji: "🥨", keywords: ["bretzel", "salé"] },
      { emoji: "🥯", keywords: ["bagel", "pain"] },
      { emoji: "🧀", keywords: ["fromage", "laitier"] },
      { emoji: "🥚", keywords: ["œuf", "aliment"] },
      { emoji: "🍳", keywords: ["cuisson", "œuf"] },
      { emoji: "🧈", keywords: ["beurre", "laitier"] },
      { emoji: "🥞", keywords: ["pancakes", "petit déjeuner"] },
      { emoji: "🧇", keywords: ["gaufre", "petit déjeuner"] },
      { emoji: "🥓", keywords: ["bacon", "viande"] },
      { emoji: "🥩", keywords: ["steak", "viande"] },
      { emoji: "🍗", keywords: ["poulet", "viande"] },
      { emoji: "🍖", keywords: ["viande", "os"] },
      { emoji: "🦴", keywords: ["os", "viande"] },
      { emoji: "🌭", keywords: ["hot dog", "saucisse"] },
      { emoji: "🍔", keywords: ["hamburger", "fast food"] },
      { emoji: "🍟", keywords: ["frites", "fast food"] }
    ]
  },
  {
    id: 'travel',
    title: "🚗 Voyage & Lieux",
    emojis: [
      { emoji: "🚗", keywords: ["voiture", "auto", "transport"] },
      { emoji: "🚕", keywords: ["taxi", "voiture", "jaune"] },
      { emoji: "🚙", keywords: ["suv", "voiture", "4x4"] },
      { emoji: "🚌", keywords: ["bus", "transport", "public"] },
      { emoji: "🚎", keywords: ["trolleybus", "transport"] },
      { emoji: "🏎", keywords: ["formule 1", "course", "rapide"] },
      { emoji: "🚓", keywords: ["police", "voiture", "urgence"] },
      { emoji: "🚑", keywords: ["ambulance", "urgence", "médical"] },
      { emoji: "🚒", keywords: ["pompier", "urgence", "feu"] },
      { emoji: "🚐", keywords: ["minibus", "transport"] },
      { emoji: "🛻", keywords: ["pickup", "camionnette"] },
      { emoji: "🚚", keywords: ["camion", "livraison"] },
      { emoji: "🚛", keywords: ["poids lourd", "transport"] },
      { emoji: "🚜", keywords: ["tracteur", "ferme", "agricole"] },
      { emoji: "🏍", keywords: ["moto", "véhicule"] },
      { emoji: "🛵", keywords: ["scooter", "véhicule"] },
      { emoji: "🚲", keywords: ["vélo", "bicyclette"] },
      { emoji: "🛴", keywords: ["trottinette", "mobilité"] },
      { emoji: "🛹", keywords: ["skateboard", "planche"] },
      { emoji: "🛼", keywords: ["roller", "patin"] },
      { emoji: "🚁", keywords: ["hélicoptère", "vol"] },
      { emoji: "🛸", keywords: ["ovni", "extraterrestre"] },
      { emoji: "✈️", keywords: ["avion", "vol", "voyage"] },
      { emoji: "🛩", keywords: ["petit avion", "vol"] },
      { emoji: "🛫", keywords: ["avion", "décollage"] },
      { emoji: "🛬", keywords: ["avion", "atterrissage"] },
      { emoji: "🪂", keywords: ["parachute", "saut"] },
      { emoji: "⛵", keywords: ["voilier", "bateau"] },
      { emoji: "🚤", keywords: ["hors-bord", "bateau"] },
      { emoji: "🛥", keywords: ["bateau", "moteur"] },
      { emoji: "🛳", keywords: ["paquebot", "navire"] },
      { emoji: "⛴", keywords: ["ferry", "bateau"] },
      { emoji: "🚢", keywords: ["bateau", "navire"] },
      { emoji: "⚓", keywords: ["ancre", "bateau"] },
      { emoji: "🚆", keywords: ["train", "transport"] },
      { emoji: "🚄", keywords: ["train", "rapide", "TGV"] },
      { emoji: "🚅", keywords: ["train", "rapide", "bullet"] },
      { emoji: "🚇", keywords: ["métro", "souterrain"] },
      { emoji: "🚈", keywords: ["train léger", "transport"] },
      { emoji: "🚉", keywords: ["gare", "train"] },
      { emoji: "🚊", keywords: ["tramway", "transport"] }
    ]
  },
  {
    id: 'objects',
    title: "⚽ Objets & Symboles",
    emojis: [
      { emoji: "⚽", keywords: ["football", "ballon", "sport"] },
      { emoji: "🏀", keywords: ["basket", "ballon", "sport"] },
      { emoji: "🏈", keywords: ["rugby", "américain", "sport"] },
      { emoji: "⚾", keywords: ["baseball", "ballon", "sport"] },
      { emoji: "🥎", keywords: ["softball", "ballon", "sport"] },
      { emoji: "🎾", keywords: ["tennis", "ballon", "sport"] },
      { emoji: "🏐", keywords: ["volley", "ballon", "sport"] },
      { emoji: "🏉", keywords: ["rugby", "ballon", "sport"] },
      { emoji: "🥏", keywords: ["frisbee", "disque"] },
      { emoji: "🎱", keywords: ["billard", "huit", "jeu"] },
      { emoji: "🪀", keywords: ["yoyo", "jouet"] },
      { emoji: "🏓", keywords: ["ping pong", "tennis de table"] },
      { emoji: "🏸", keywords: ["badminton", "raquette"] },
      { emoji: "🏒", keywords: ["hockey", "bâton", "glace"] },
      { emoji: "🏑", keywords: ["hockey", "gazon", "bâton"] },
      { emoji: "🥍", keywords: ["lacrosse", "sport"] },
      { emoji: "🏏", keywords: ["cricket", "sport"] },
      { emoji: "🪃", keywords: ["boomerang", "lancer"] },
      { emoji: "🥅", keywords: ["but", "filet"] },
      { emoji: "⛳", keywords: ["drapeau", "golf"] },
      { emoji: "🪁", keywords: ["cerf-volant", "vent"] },
      { emoji: "🏹", keywords: ["arc", "flèche"] },
      { emoji: "🎣", keywords: ["pêche", "poisson"] },
      { emoji: "🤿", keywords: ["plongée", "masque"] },
      { emoji: "🎽", keywords: ["maillot", "course"] },
      { emoji: "🎿", keywords: ["ski", "neige"] },
      { emoji: "🛷", keywords: ["luge", "neige"] },
      { emoji: "🥌", keywords: ["pierre", "curling"] },
      { emoji: "🎯", keywords: ["cible", "dard"] },
      { emoji: "🪄", keywords: ["baguette", "magie"] },
      { emoji: "🧿", keywords: ["nazar", "amulette"] },
      { emoji: "🎮", keywords: ["manette", "jeu vidéo"] },
      { emoji: "🕹️", keywords: ["joystick", "jeu"] },
      { emoji: "🎲", keywords: ["dé", "jeu"] },
      { emoji: "♟️", keywords: ["pion", "échecs"] },
      { emoji: "🎭", keywords: ["arts", "théâtre"] },
      { emoji: "🔮", keywords: ["boule de cristal", "magie"] },
      { emoji: "🪅", keywords: ["piñata", "fête"] },
      { emoji: "🧸", keywords: ["ours en peluche", "jouet"] },
      { emoji: "🪩", keywords: ["boule disco", "fête"] },
      { emoji: "🪫", keywords: ["batterie", "faible"] },
      { emoji: "🔋", keywords: ["batterie", "énergie"] },
      { emoji: "🔌", keywords: ["prise", "électricité"] },
      { emoji: "📱", keywords: ["téléphone", "mobile"] },
      { emoji: "💻", keywords: ["ordinateur", "laptop"] },
      { emoji: "🖨️", keywords: ["imprimante", "bureau"] },
      { emoji: "📷", keywords: ["appareil photo", "photo"] },
      { emoji: "📡", keywords: ["antenne", "satellite"] }
    ]
  },
  {
    id: 'symbols',
    title: "💯 Symboles & Signes",
    emojis: [
      { emoji: "❤️", keywords: ["cœur", "amour", "rouge"] },
      { emoji: "🧡", keywords: ["cœur", "orange", "amour"] },
      { emoji: "💛", keywords: ["cœur", "jaune", "amour"] },
      { emoji: "💚", keywords: ["cœur", "vert", "amour"] },
      { emoji: "💙", keywords: ["cœur", "bleu", "amour"] },
      { emoji: "💜", keywords: ["cœur", "violet", "amour"] },
      { emoji: "🖤", keywords: ["cœur", "noir", "amour"] },
      { emoji: "🤍", keywords: ["cœur", "blanc", "amour"] },
      { emoji: "🤎", keywords: ["cœur", "marron", "amour"] },
      { emoji: "💔", keywords: ["cœur", "brisé", "rupture"] },
      { emoji: "❤️‍🔥", keywords: ["cœur", "feu", "passion"] },
      { emoji: "❤️‍🩹", keywords: ["cœur", "guérison", "convalescence"] },
      { emoji: "❣️", keywords: ["cœur", "exclamation"] },
      { emoji: "💕", keywords: ["cœurs", "amour"] },
      { emoji: "💞", keywords: ["cœurs", "tournants"] },
      { emoji: "💓", keywords: ["cœur", "battement"] },
      { emoji: "💗", keywords: ["cœur", "grandissant"] },
      { emoji: "💖", keywords: ["cœur", "étincelles"] },
      { emoji: "💘", keywords: ["cœur", "flèche"] },
      { emoji: "💝", keywords: ["cœur", "ruban"] },
      { emoji: "💟", keywords: ["cœur", "décoration"] },
      { emoji: "☮️", keywords: ["paix", "symbole"] },
      { emoji: "✝️", keywords: ["croix", "religion"] },
      { emoji: "☪️", keywords: ["islam", "religion"] },
      { emoji: "🕉️", keywords: ["om", "hindou"] },
      { emoji: "☸️", keywords: ["dharma", "religion"] },
      { emoji: "✡️", keywords: ["étoile", "david", "juif"] },
      { emoji: "🔯", keywords: ["étoile", "six branches"] },
      { emoji: "🕎", keywords: ["menorah", "judaïsme"] },
      { emoji: "☯️", keywords: ["yin yang", "équilibre"] },
      { emoji: "☦️", keywords: ["croix", "orthodoxe"] },
      { emoji: "🛐", keywords: ["lieu", "culte"] },
      { emoji: "⛎", keywords: ["ophiuchus", "zodiaque"] },
      { emoji: "♈", keywords: ["bélier", "zodiaque"] },
      { emoji: "♉", keywords: ["taureau", "zodiaque"] },
      { emoji: "♊", keywords: ["gémeaux", "zodiaque"] },
      { emoji: "♋", keywords: ["cancer", "zodiaque"] },
      { emoji: "♌", keywords: ["lion", "zodiaque"] },
      { emoji: "♍", keywords: ["vierge", "zodiaque"] },
      { emoji: "♎", keywords: ["balance", "zodiaque"] },
      { emoji: "♏", keywords: ["scorpion", "zodiaque"] },
      { emoji: "♐", keywords: ["sagittaire", "zodiaque"] },
      { emoji: "♑", keywords: ["capricorne", "zodiaque"] },
      { emoji: "♒", keywords: ["verseau", "zodiaque"] },
      { emoji: "♓", keywords: ["poissons", "zodiaque"] },
      { emoji: "🆔", keywords: ["id", "identité"] },
      { emoji: "⚛️", keywords: ["atome", "science"] },
      { emoji: "🉑", keywords: ["accepter", "japonais"] },
      { emoji: "☢️", keywords: ["radioactif", "danger"] },
      { emoji: "☣️", keywords: ["biohazard", "danger"] }
    ]
  }
];

// Emoji picker amélioré
const EmojiPicker = ({ onEmojiSelect, isOpen, onOpenChange }: any) => {
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
const ColorPalette = ({ selectedColor, onColorSelect }: any) => {
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

interface ReportEditorProps {
  initialData?: {
    title: string;
    content: string;
    importance: string;
    tags: string[];
    color: string;
    icon: string;
  };
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  folderId?: string;
  draftId?: string;
}

// ... existing code ...

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
          return matches.map((match, index) => {
            const [_, type, id, content] = match;
            let processedContent: any = content.trim();
            
            // Process specific block types
            switch (type) {
              case 'text':
                // Extraction des informations d'alignement
                const alignRegex = /^<!-- data-align:(left|center|right) -->([\s\S]*)$/;
                const alignMatch = processedContent.match(alignRegex);
                
                if (alignMatch) {
                  return {
                    id,
                    type,
                    content: { 
                      text: alignMatch[2].trim(),
                      alignment: alignMatch[1]
                    },
                    order: index
                  };
                } else {
                  return {
                    id,
                    type,
                    content: { 
                      text: processedContent,
                      alignment: 'left'  // Alignement par défaut
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
                // ...existing code...
                break;

              // ...existing code...
            }

            return { id, type, content: processedContent, order: index };
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
          alignment: 'left'  // Alignement par défaut
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
  const [isUploading, setIsUploading] = useState(false);
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
    return blocks.map((block, index) => {
      let blockContent = '';
      
      switch (block.type) {
        case 'text':
          // CORRECTION: Ne pas utiliser de balises spéciales pour l'alignement
          if (typeof block.content === 'object' && block.content !== null) {
            blockContent = block.content.text || '';
            // Stocker l'alignement dans un attribut de données
            if (block.content.alignment && block.content.alignment !== 'left') {
              blockContent = `<!-- data-align:${block.content.alignment} -->${blockContent}`;
            }
          } else {
            blockContent = block.content || '';
          }
          break;
        case 'heading':
          const level = '#'.repeat(block.content?.level || 1);
          blockContent = `${level} ${block.content?.text || ''}`;
          break;
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
        case 'checklist':
          blockContent = block.content.map((item: any) => 
            `- [${item.checked ? 'x' : ' '}] ${item.text}`
          ).join('\n');
          break;
        case 'quote':
          blockContent = `> ${block.content}`;
          break;
        case 'code':
          // MODIFICATION: Correction du format de sauvegarde
          let codeLanguage = 'plaintext';
          let codeContent = '';
          
          if (typeof block.content === 'object' && block.content !== null) {
            codeLanguage = block.content.language || 'plaintext';
            codeContent = block.content.code || '';
          } else {
            codeContent = String(block.content || '');
          }
          
          // Si le langage est "plaintext", utiliser une chaîne vide pour le markdown
          const markdownLanguage = codeLanguage === 'plaintext' ? '' : codeLanguage;
          blockContent = `\`\`\`${markdownLanguage}\n${codeContent}\n\`\`\``;
          break;
        
        case 'image':
          const caption = block.content?.caption ? `\n*${block.content.caption}*` : '';
          const wrapText = block.content?.wrapText ? `\n\n${block.content.wrapText}` : '';
          const alignment = block.content?.alignment || 'center';
          blockContent = `{{image-block:${alignment}}}![${block.content?.alt || ''}](${block.content?.src || ''})${caption}{{wrap-text}}${wrapText}{{/image-block}}`;
          break;
        case 'divider':
          blockContent = '---';
          break;
        case 'spacer':
          blockContent = `{{spacer:${block.content?.height || 40}}}`;
          break;
        default:
          blockContent = block.content || '';
      }
      
      return `{{block-${block.type}-${block.id}}}\n${blockContent}\n{{/block-${block.type}-${block.id}}}`;
    }).join('\n\n');
  }, [blocks]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("L'image est trop lourde. Maximum 8MB.");
      return;
    }

    setIsUploading(true);
    try {
      const imageUrl = await uploadToDiscord(file);
      // Insérer l'image sous forme de bloc
      setBlocks(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'image',
          content: {
            src: imageUrl,
            alt: file.name
          },
          order: prev.length
        }
      ]);
      toast.success("Image ajoutée avec succès");
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const addTag = (tagValue?: string) => {
    const tagToAdd = tagValue || newTag.trim();
    if (tagToAdd && !tags.includes(tagToAdd)) {
      setTags([...tags, tagToAdd]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
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
      
      // Supprimer le brouillon après sauvegarde réussie
      if (draftId) {
        await deleteDraftAfterSave();
      }
      
      // CORRECTION: Message plus spécifique selon le contexte
      const isEditingReport = !!initialData;
      const successMessage = isEditingReport 
        ? "Rapport mis à jour avec succès" 
        : "Rapport créé avec succès";
      
      // CORRECTION: Vérifier que session existe avant d'y accéder
      const showAuthorInfo = isEditingReport && 
                            initialData?.author?.name && 
                            session?.user?.anonymousNickname &&
                            initialData.author.name !== session.user.anonymousNickname;
      
      toast.success(successMessage, {
        description: showAuthorInfo 
          ? `Rapport modifié (auteur original: ${initialData.author.name})`
          : undefined
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la sauvegarde";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

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

  // Convertir les blocs en contenu HTML pour l'aperçu - CORRIGÉ
  const convertBlocksToHTML = useCallback(() => {
    return blocks.map((block, index) => {
      let blockHTML = '';
      
      switch (block.type) {
        case 'text':
          let textContent = '';
          let alignment = 'left'; // CORRECTION: Déclaration avec let au lieu de const
          
          // CORRECTION: Gérer le nouveau format avec alignement
          if (typeof block.content === 'object' && block.content !== null) {
            textContent = (block.content.text || '')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/~~(.*?)~~/g, '<del>$1</del>')
              .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
              .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
              .replace(/\n/g, '<br>');
            alignment = block.content.alignment || 'left';
          } else {
            textContent = (block.content || '')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/~~(.*?)~~/g, '<del>$1</del>')
              .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
              .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
              .replace(/\n/g, '<br>');
          }
          
          // CORRECTION: Wrapper chaque bloc de texte avec alignement
          blockHTML = `<div class="text-block mb-4 ${index === blocks.length - 1 ? '' : 'border-b border-transparent pb-4'}" style="text-align: ${alignment};">${textContent}</div>`;
          break;
          
        case 'heading':
          const level = block.content?.level || 1;
          const text = block.content?.text || '';
          blockHTML = `<div class="heading-block mb-4"><h${level} class="${getHeadingClass(level)}">${text}</h${level}></div>`;
          break;
          
        case 'table':
          try {
            // Ensure tableData always has valid headers and rows arrays
            const tableData = {
              headers: Array.isArray(block.content?.headers) ? block.content.headers : [],
              rows: Array.isArray(block.content?.rows) ? block.content.rows : []
            };
            
            // If no headers, create default ones
            if (tableData.headers.length === 0) {
              tableData.headers = ['Column 1', 'Column 2'];
            }
            
            // Ensure at least one empty row exists
            if (tableData.rows.length === 0) {
              tableData.rows = [tableData.headers.map(() => '')];
            }
            
            let tableHTML = `
              <div class="table-block mb-4">
                <div class="w-full overflow-auto rounded-lg border border-border bg-background shadow-sm">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-muted/50 border-b border-border">
            `;
            
            tableData.headers.forEach(header => {
              // MODIFICATION: Traitement plus strict pour éviter le markdown
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
            
            tableData.rows.forEach(row => {
              if (!Array.isArray(row)) return;
              
              tableHTML += `<tr class="border-b border-border last:border-b-0">`;
              
              // Ensure each row has the correct number of cells
              const paddedRow = [...row];
              while (paddedRow.length < tableData.headers.length) {
                paddedRow.push('');
              }
              
              paddedRow.forEach(cell => {
                // MODIFICATION: Traitement plus strict pour éviter le markdown
                const safeCell = typeof cell === 'string' ? 
                  cell
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;') : '';
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
              codeContent = block.content.code || '';
              codeLanguage = block.content.language || 'plaintext';
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
          if (!block.content?.src) {
            blockHTML = '<div class="image-block mb-4"></div>';
            break;
          }
          
          const src = block.content.src;
          const alt = (block.content.alt || '').replace(/"/g, '&quot;');
          const caption = block.content.caption ? `<p class="text-sm text-center text-muted-foreground mt-2">${block.content.caption}</p>` : '';
          const imageAlignment = block.content.alignment || 'center'; // CORRECTION: Renommage de la variable pour éviter les conflits
          const wrapText = block.content.wrapText || '';
          
          if (imageAlignment === 'center') {
            blockHTML = `
              <div class="image-block mb-4">
                <div class="text-center my-6">
                  <img src="${src}" alt="${alt}" class="rounded-lg max-h-96 mx-auto shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 inline-block" />
                  ${caption}
                  ${wrapText ? `<div class="mt-4 text-left">${wrapText}</div>` : ''}
                </div>
              </div>
            `;
          } else if (imageAlignment === 'left') {
            blockHTML = `
              <div class="image-block mb-4">
                <div class="flex gap-4 items-start my-6">
                  <img src="${src}" alt="${alt}" class="rounded-lg max-h-64 max-w-sm shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 flex-shrink-0" />
                  <div class="flex-1 min-w-0">
                    ${wrapText || ''}
                    ${caption}
                  </div>
                </div>
              </div>
            `;
          } else if (imageAlignment === 'right') {
            blockHTML = `
              <div class="image-block mb-4">
                <div class="flex gap-4 items-start my-6">
                  <div class="flex-1 min-w-0">
                    ${wrapText || ''}
                    ${caption}
                  </div>
                  <img src="${src}" alt="${alt}" class="rounded-lg max-h-64 max-w-sm shadow-lg border border-border hover:shadow-xl transition-shadow duration-300 flex-shrink-0" />
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
          blockHTML = `<div class="unknown-block mb-4">${block.content || ''}</div>`;
      }
      
      return blockHTML;
    }).join('\n');
  }, [blocks]);

  // Fonction helper pour les classes d'en-tête
  const getHeadingClass = (level: number) => {
    const classes = {
      1: "text-3xl font-bold mt-8 mb-4 text-primary",
      2: "text-2xl font-bold mt-8 mb-4", 
      3: "text-xl font-semibold mt-6 mb-3",
      4: "text-lg font-semibold mt-6 mb-3",
      5: "text-base font-semibold mt-4 mb-2",
      6: "text-sm font-semibold mt-4 mb-2"
    };
    return classes[level as keyof typeof classes] || classes[1];
  };

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
              {/* Aperçu disponible même pour les nouveaux rapports */
              (initialData || blocks.length > 0 || title.trim()) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Aperçu
                </Button>
              )}
              
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
                <Label>Niveau d'importance</Label>
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
                      Changer l'icône
                    </Button>
                  }>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Smile className="h-4 w-4 mr-2" />
                        Changer l'icône
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <EmojiPicker
                        onEmojiSelect={setIcon}
                        isOpen={true}
                        onOpenChange={() => {}}
                      />
                    </PopoverContent>
                  </ClientSidePopover>
                </div>
              </div>

              {/* Sélecteur de couleur avec popover */}
              <div className="space-y-2">
                <Label>Couleur d'accentuation</Label>
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
              <BlockEditor blocks={blocks} onChange={setBlocks} />
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