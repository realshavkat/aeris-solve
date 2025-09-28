"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function BannedPage() {

  useEffect(() => {
    // Empêcher le retour en arrière
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
    };
    
    window.addEventListener("popstate", preventBack);
    preventBack(); // Appliquer immédiatement

    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, []);

  const handleSignOut = () => {
    signOut({ 
      callbackUrl: "/",
      redirect: true 
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-24 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
      <Card className="w-[500px] border-red-200 shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mb-4">
            <Ban className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl text-red-700 dark:text-red-300">
            Compte Banni
          </CardTitle>
          <CardDescription className="text-base text-red-600 dark:text-red-400">
            Votre accès à la plateforme a été révoqué par un administrateur.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-red-50 dark:bg-red-950/50 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
              Que signifie ceci ?
            </h3>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>• Votre compte a été banni par un administrateur</li>
              <li>• Vous ne pouvez plus accéder aux fonctionnalités du site</li>
              <li>• Cette décision peut être temporaire ou permanente</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/50 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Que faire maintenant ?
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez un administrateur 
              sur Discord pour faire appel de cette décision.
            </p>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSignOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
