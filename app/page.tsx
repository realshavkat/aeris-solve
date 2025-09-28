// Fichier: app/page.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
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
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [rpName, setRpName] = useState("");
  const [anonymousNickname, setAnonymousNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      console.log("Session user:", session.user); // Debug
      
      // Redirection immédiate basée sur le statut
      if (session.user.status === "approved") {
        console.log("Utilisateur approuvé, redirection vers dashboard");
        router.replace("/dashboard");
        return;
      }
      
      if (session.user.status === "pending") {
        console.log("Utilisateur en attente, redirection vers waiting");
        router.replace("/waiting");
        return;
      }
      
      // Pour needs_registration et rejected, reste sur la page
      if (session.user.status !== "needs_registration" && 
          session.user.status !== "rejected") {
        console.error("Statut utilisateur invalide:", session.user.status);
        signOut();
      }
    }
  }, [status, session, router]);

  // Rafraîchir la session UNIQUEMENT sur la page d'attente
  // (pas pendant la saisie du formulaire)
  // Donc ici, pas de setInterval sur la page d'accueil

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Si l'utilisateur est en attente ou approuvé, ne pas afficher le formulaire
  if (
    status === "authenticated" &&
    session?.user &&
    (session.user.status === "approved" || session.user.status === "pending")
  ) {
    return null;
  }

  const validateInputs = () => {
    if (rpName.trim().length < 3) {
      setFormError("Le nom RP doit contenir au moins 3 caractères");
      return false;
    }
    if (anonymousNickname.trim().length < 3) {
      setFormError("Le surnom anonyme doit contenir au moins 3 caractères");
      return false;
    }
    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    
    if (!session?.user || status !== "authenticated") {
      setFormError("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    if (!validateInputs()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rpName: rpName.trim(),
          anonymousNickname: anonymousNickname.trim(),
          userId: session.user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Une erreur est survenue lors de l'enregistrement.");
      }

      console.log("Formulaire soumis avec succès, mise à jour session...");
      
      // Rafraîchir la session pour obtenir le nouveau statut
      await update();
      
      // Petite pause pour s'assurer que la session est mise à jour
      setTimeout(() => {
        console.log("Redirection vers /waiting");
        router.replace("/waiting");
      }, 100);

    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Une erreur inattendue est survenue. Veuillez réessayer.");
      console.error("Registration error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {status === "authenticated" &&
      (session.user.status === "needs_registration" || session.user.status === "rejected") ? (
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>
              {session.user.status === "rejected"
                ? "Demande Refusée"
                : `Bienvenue, ${session.user.name}`}
            </CardTitle>
            <CardDescription>
              {session.user.status === "rejected"
                ? "Votre demande précédente a été refusée. Veuillez soumettre une nouvelle demande."
                : "Veuillez compléter votre profil pour accéder aux services."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} id="rp-registration-form" className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="rpName">Nom RP</Label>
                <Input id="rpName" placeholder="Votre nom RP" value={rpName} onChange={(e) => setRpName(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="anonymousNickname">Surnom Anonyme</Label>
                <Input id="anonymousNickname" placeholder="Votre surnom anonyme" value={anonymousNickname} onChange={(e) => setAnonymousNickname(e.target.value)} required />
              </div>
              {formError && (
                <p className="text-sm font-medium text-destructive">{formError}</p>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              type="submit"
              form="rp-registration-form"
              disabled={isSubmitting}
              className="w-full mb-2 cursor-pointer"
            >
              {isSubmitting ? "Envoi en cours..." : "Soumettre"}
            </Button>
            <Separator className="my-2" />
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full cursor-pointer"
            >
              Se déconnecter
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="w-[450px] text-center">
          <CardHeader>
            <CardTitle>Connexion à Aeris</CardTitle>
            <CardDescription>
              Connectez-vous pour accéder à la plateforme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => signIn("discord")}
              className="w-full cursor-pointer"
            >
              Se connecter avec Discord
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}