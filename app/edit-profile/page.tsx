"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function EditProfilePage() {
  const router = useRouter();
  const [rpName, setRpName] = useState("");
  const [anonymousNickname, setAnonymousNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const res = await fetch("/api/user-data");
      const data = await res.json();
      if (res.ok) {
        setRpName(data.rpName);
        setAnonymousNickname(data.anonymousNickname);
      }
    };
    fetchUserData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rpName, anonymousNickname }),
      });
      
      if (res.ok) {
        router.push("/waiting");
      } else {
        const data = await res.json();
        setError(data.message);
      }
    } catch (err) {
      setError("Une erreur est survenue", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Modifier mon profil</CardTitle>
          <CardDescription>
            Modifiez vos informations de profil
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="rpName">Nom RP</Label>
              <Input
                id="rpName"
                value={rpName}
                onChange={(e) => setRpName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anonymousNickname">Surnom Anonyme</Label>
              <Input
                id="anonymousNickname"
                value={anonymousNickname}
                onChange={(e) => setAnonymousNickname(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={() => router.push("/waiting")}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
