import { useState, useCallback } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "../ui/button";
import { uploadToDiscord } from "@/lib/discord-upload";

export function MarkdownEditor({ 
  value, 
  onChange,
  onSaveBackup 
}: { 
  value: string;
  onChange: (value: string) => void;
  onSaveBackup: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = useCallback(async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { // 8MB limit
      alert("L'image est trop lourde. Maximum 8MB.");
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadToDiscord(file);
      const imageMarkdown = `![${file.name}](${imageUrl})`;
      onChange(value + "\n" + imageMarkdown);
    } catch (error) {
      console.error("Erreur upload:", error);
      alert("Erreur lors de l'upload de l'image");
    } finally {
      setUploading(false);
    }
  }, [value, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleImageUpload(file);
            };
            input.click();
          }}
          disabled={uploading}
        >
          {uploading ? "Upload..." : "Ajouter une image"}
        </Button>
        <Button onClick={onSaveBackup}>
          Sauvegarder Backup
        </Button>
      </div>

      <MDEditor
        value={value}
        onChange={val => onChange(val || "")}
        height={400}
      />
    </div>
  );
}
