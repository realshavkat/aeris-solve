"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FolderIcon, 
  FileText, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Activity,
  BarChart3,
  UserCheck,
  UserX,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  rejectedUsers: number;
  totalFolders: number;
  totalReports: number;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header avec gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10 rounded-2xl p-8 border">
        <div className="absolute inset-0 bg-grid-white/10 bg-grid-16" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-orange-100 dark:bg-orange-950 rounded-2xl">
              <Settings className="w-10 h-10 text-orange-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Administration Aerys
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Gérez et supervisez l'ensemble de la plateforme
              </p>
            </div>
          </div>
          
          {/* Actions rapides */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/dashboard/admin/users">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white cursor-pointer">
                <Users className="w-4 h-4 mr-2" />
                Gérer les utilisateurs
              </Button>
            </Link>
            <Link href="/dashboard/admin/folders">
              <Button variant="outline" className="cursor-pointer">
                <FolderIcon className="w-4 h-4 mr-2" />
                Dossiers & Rapports
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-blue-600">{stats?.totalUsers || 0}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-muted-foreground">
                  {stats?.pendingUsers || 0} en attente
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Utilisateurs Approuvés</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-green-600">{stats?.approvedUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Comptes actifs
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Dossiers</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
              <FolderIcon className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-purple-600">{stats?.totalFolders || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Total des dossiers
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/10" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-medium">Rapports</CardTitle>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg">
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-indigo-600">{stats?.totalReports || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Total des rapports
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section principale avec cartes */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        {/* Alertes et actions rapides */}
        <div className="lg:col-span-2 space-y-6">
          {/* Demandes en attente */}
          {(stats?.pendingUsers || 0) > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Demandes en attente
                  </CardTitle>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    {stats?.pendingUsers || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {stats?.pendingUsers || 0} utilisateur{(stats?.pendingUsers || 0) !== 1 ? 's' : ''} en attente d'approbation
                </p>
                <Link href="/dashboard/admin/users">
                  <Button className="w-full cursor-pointer">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Traiter les demandes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Aperçu des statistiques détaillées */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Répartition des utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.approvedUsers || 0}</div>
                  <div className="text-sm text-muted-foreground">Approuvés</div>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">{stats?.pendingUsers || 0}</div>
                  <div className="text-sm text-muted-foreground">En attente</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{stats?.rejectedUsers || 0}</div>
                  <div className="text-sm text-muted-foreground">Refusés</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contenu */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Aperçu du contenu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-950 rounded-lg">
                    <FolderIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats?.totalFolders || 0}</div>
                    <div className="text-sm text-muted-foreground">Dossiers</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-950 rounded-lg">
                    <FileText className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
                    <div className="text-sm text-muted-foreground">Rapports</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ratio rapports/dossier</span>
                  <span className="font-medium">
                    {stats?.totalFolders ? 
                      (stats.totalReports / stats.totalFolders).toFixed(1) : 
                      '0'} r/d
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activité récente */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{activity.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Aucune activité récente</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Informations système */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                  Opérationnel
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Base de données</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  MongoDB
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
