"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileView() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mon Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={session?.user?.image || ''} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">Surnom Anonyme</h3>
              <p className="text-sm text-muted-foreground">
                {session?.user?.anonymousNickname || 'Non défini'}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Nom RP</h4>
            <p className="text-sm">{session?.user?.rpName || 'Non défini'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
