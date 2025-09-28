// Fichier: app/waiting/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function WaitingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }

    if (status === "authenticated" && session?.user) {
      // Si approuvé, rediriger vers dashboard avec transition fluide
      if (session.user.status === "approved") {
        setIsRedirecting(true);
        // Petite animation avant redirection
        setTimeout(() => {
          router.replace("/dashboard");
        }, 1500); // 1.5 secondes pour montrer l'animation d'approbation
        return;
      }

      // Si pas en attente, rediriger vers accueil
      if (session.user.status !== "pending") {
        router.replace("/");
        return;
      }

      // Vérifier le statut toutes les 10 secondes SEULEMENT si pas en cours de redirection
      const checkStatus = async () => {
        if (isRedirecting) return; // Ne pas vérifier si déjà en redirection

        try {
          const updatedSession = await update();
          
          if (updatedSession?.user?.status === "approved") {
            setIsRedirecting(true);
            // Animation fluide avant redirection
            setTimeout(() => {
              router.replace("/dashboard");
            }, 1500);
          } else if (updatedSession?.user?.status !== "pending") {
            router.replace("/");
          }
        } catch (error) {
          console.error("Erreur vérification statut:", error);
        }
      };

      const interval = setInterval(checkStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [session, status, router, update, isRedirecting]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Animation d'approbation
  if (isRedirecting) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="relative">
          <Card className="w-[450px] text-center border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center animate-pulse">
                    <CheckCircle className="w-8 h-8 text-green-600 animate-bounce" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 bg-green-200 dark:bg-green-800 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>
              <CardTitle className="text-green-700 dark:text-green-300">
                Demande approuvée ! 🎉
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                Redirection vers votre tableau de bord...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span>Bienvenue dans Aerys</span>
                <ArrowRight className="w-4 h-4 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px] text-center">
        <CardHeader>
          <CardTitle>Demande soumise ✅</CardTitle>
          <CardDescription>
            Votre demande d'accès a été envoyée avec succès.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Un administrateur examinera votre demande dans les plus brefs délais. 
              Vous serez automatiquement redirigé vers le tableau de bord une fois votre demande approuvée.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-pulse w-2 h-2 bg-primary rounded-full"></div>
            <div className="animate-pulse w-2 h-2 bg-primary rounded-full" style={{animationDelay: '0.2s'}}></div>
            <div className="animate-pulse w-2 h-2 bg-primary rounded-full" style={{animationDelay: '0.4s'}}></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Vérification automatique du statut en cours...
          </p>
        </CardContent>
        <Separator className="my-4" />
        <div className="p-6 pt-0">
          <Button 
            variant="outline" 
            onClick={() => signOut()} 
            className="w-full cursor-pointer"
          >
            Se déconnecter
          </Button>
        </div>
      </Card>
    </main>
  );
}