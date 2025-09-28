"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  User, 
  Edit3, 
  Save, 
  X, 
  Calendar,
  Shield,
  Mail,
  Hash,
  Gamepad2,
  Eye,
  CheckCircle2
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

interface UserData {
  id: string;
  rpName: string | null;
  anonymousNickname: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  discordUsername: string | null;
  status: string;
  role: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { hasPermission, refreshPermissions } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    rpName: "",
    anonymousNickname: ""
  });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserData = async () => {
    if (!session?.user?.id) {
      router.replace("/");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/user-data");
      
      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/");
          return;
        }
        
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      setUserData(data);
      setFormData({
        rpName: data.rpName || "",
        anonymousNickname: data.anonymousNickname || ""
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la récupération des données";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPermission('manageProfile')) {
      toast.error("Vous n'avez pas la permission de modifier votre profil");
      return;
    }

    if (!formData.rpName.trim() || !formData.anonymousNickname.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rpName: formData.rpName.trim(),
          anonymousNickname: formData.anonymousNickname.trim()
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Erreur inconnue" }));
        throw new Error(error.error || "Erreur lors de la mise à jour");
      }

      const result = await response.json();
      
      await fetchUserData();
      // Rafraîchir les permissions seulement après modification
      await refreshPermissions();
      
      // Afficher un message spécifique si le nom a été propagé
      if (result.message) {
        toast.success(result.message, {
          description: "Vos dossiers, rapports et autres contenus affichent maintenant votre nouveau nom.",
          duration: 5000,
        });
      } else {
        toast.success("Profil mis à jour avec succès");
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la mise à jour du profil";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'member': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'visitor': return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 lg:p-12 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded-lg w-48 mb-6"></div>
            <div className="bg-card rounded-xl p-8 border shadow-sm">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-24 h-24 bg-muted rounded-full"></div>
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-48"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen p-8 lg:p-12 max-w-4xl mx-auto flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchUserData} className="cursor-pointer">
              <Eye className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
            <p className="text-muted-foreground">
              Gérez vos informations personnelles et préférences
            </p>
          </div>
        </div>

        {/* Carte principale du profil */}
        <Card className="overflow-hidden shadow-sm border pt-0">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-6">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage 
                  src={userData?.image || ""} 
                  alt="Avatar de profil"
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl font-bold bg-primary/10">
                  {userData?.anonymousNickname?.[0]?.toUpperCase() || 
                   userData?.name?.[0]?.toUpperCase() || 
                   "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">
                    {userData?.anonymousNickname || "Non défini"}
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={`${getRoleColor(userData?.role || '')} font-medium`}
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {userData?.role?.toUpperCase() || "UNKNOWN"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {userData?.rpName || "Nom RP non défini"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(userData?.status || '')}`}>
                    {userData?.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {userData?.status === 'approved' ? 'Compte approuvé' : 
                     userData?.status === 'pending' ? 'En attente d\'approbation' :
                     userData?.status === 'rejected' ? 'Compte refusé' : 'Statut inconnu'}
                  </div>
                </div>
              </div>

              {!isEditing && hasPermission('manageProfile') && (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  variant="outline"
                  className="cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Modifier le profil
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informations Discord - Non modifiables */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Discord
                    </Label>
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                      <p className="text-sm font-mono">{userData?.discordUsername || "Non défini"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground">Non disponible</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Statut du compte
                    </Label>
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                      <p className="text-sm capitalize">{userData?.status || "Non défini"}</p>
                    </div>
                  </div>
                </div>

                {/* Informations modifiables */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rpName" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nom RP
                    </Label>
                    {isEditing ? (
                      <Input
                        id="rpName"
                        value={formData.rpName}
                        onChange={(e) => setFormData({ ...formData, rpName: e.target.value })}
                        placeholder="Votre nom de personnage RP"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    ) : (
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-sm">{userData?.rpName || "Non défini"}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anonymousNickname" className="text-sm font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Surnom Anonyme
                    </Label>
                    {isEditing ? (
                      <Input
                        id="anonymousNickname"
                        value={formData.anonymousNickname}
                        onChange={(e) => setFormData({ ...formData, anonymousNickname: e.target.value })}
                        placeholder="Votre surnom public"
                        className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                        required
                      />
                    ) : (
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="text-sm">{userData?.anonymousNickname || "Non défini"}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Rôle
                    </Label>
                    <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                      <p className="text-sm capitalize">{userData?.role || "Non défini"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isEditing && (
                <>
                  <Separator />
                  <div className="flex items-center justify-end gap-3">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          rpName: userData?.rpName || "",
                          anonymousNickname: userData?.anonymousNickname || ""
                        });
                      }} 
                      className="cursor-pointer"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      className="cursor-pointer"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer les modifications
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Message de permission insuffisante */}
        {!hasPermission('manageProfile') && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 mb-6">
            <CardContent className="p-4">
              <p className="text-red-700 dark:text-red-400">
                Vous n&apos;avez pas la permission de modifier votre profil.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}