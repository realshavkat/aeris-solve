"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Search, 
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Mission {
  _id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'in_progress' | 'completed' | 'cancelled';
  assignedUsers: Array<{
    id: string;
    name: string;
  }>;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const priorityOptions = [
  { value: 'low', label: 'Basse', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '📘' },
  { value: 'medium', label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🎯' },
  { value: 'high', label: 'Élevée', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🔥' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-700 border-red-200', icon: '⚡' }
];

const statusOptions = [
  { value: 'in_progress', label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'completed', label: 'Terminée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle }
];

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      const response = await fetch("/api/missions");
      if (response.ok) {
        const data = await response.json();
        setMissions(data);
      }
    } catch (error) {
      console.error("Erreur chargement missions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(mission => {
    const matchesSearch = 
      mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || mission.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || mission.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Séparer les missions en cours des autres
  const inProgressMissions = filteredMissions.filter(m => m.status === 'in_progress');
  const completedCancelledMissions = filteredMissions.filter(m => m.status !== 'in_progress');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-12 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Mes Missions
          </h1>
          <p className="text-muted-foreground">
            Consultez les missions qui vous ont été assignées
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des missions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Missions en cours - Prioritaires */}
      {inProgressMissions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Missions en cours ({inProgressMissions.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {inProgressMissions.map((mission) => (
              <MissionCard key={mission._id} mission={mission} />
            ))}
          </div>
        </div>
      )}

      {/* Missions terminées/annulées - Grisées */}
      {completedCancelledMissions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-5 h-5" />
            Missions terminées/annulées ({completedCancelledMissions.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedCancelledMissions.map((mission) => (
              <MissionCard key={mission._id} mission={mission} isCompleted={true} />
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {filteredMissions.length === 0 && (
        <Card className="text-center py-16">
          <CardContent>
            <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-semibold mb-2">Aucune mission trouvée</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? "Aucune mission ne correspond à vos filtres"
                : "Aucune mission ne vous a été assignée pour le moment"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Composant pour une carte de mission
function MissionCard({ mission, isCompleted = false }: { mission: Mission, isCompleted?: boolean }) {
  const priority = priorityOptions.find(p => p.value === mission.priority);
  const status = statusOptions.find(s => s.value === mission.status);
  const StatusIcon = status?.icon || Clock;

  return (
    <Card className={`transition-all ${isCompleted ? 'opacity-60 hover:opacity-80 grayscale' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{priority?.icon}</span>
              <CardTitle className="text-lg line-clamp-1">{mission.title}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {mission.description}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {priority && (
            <Badge variant="outline" className={`${priority.color} border`}>
              {priority.icon} {priority.label}
            </Badge>
          )}
          {status && (
            <Badge variant="outline" className={`${status.color} border`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            Assigné par {mission.createdBy.name}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(mission.createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
