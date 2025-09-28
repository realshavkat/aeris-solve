import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function FolderCard() {
  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
      <CardHeader>
        <CardTitle>Titre du dossier</CardTitle>
        <CardDescription>Description du dossier</CardDescription>
      </CardHeader>
    </Card>
  );
}
