"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar,
  Tag,
  Flag,
  SortAsc,
  SortDesc,
  List,
  Grid3X3
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ReportEditor } from "@/components/reports/report-editor";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Link from "next/link";
import { DraftsDialog } from "@/components/dashboard/drafts-dialog";
import { FileText } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { parseMarkdownWithColors } from "@/components/reports/block-editor";

const importanceOptions = [
  { value: "low", label: "Faible", color: "bg-green-500/10 text-green-700 border-green-200", icon: "🟢" },
  { value: "medium", label: "Moyen", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: "🟡" },
  { value: "high", label: "Élevé", color: "bg-orange-500/10 text-orange-700 border-orange-200", icon: "🟠" },
  { value: "critical", label: "Critique", color: "bg-red-500/10 text-red-700 border-red-200", icon: "🔴" },
];

type SortField = 'title' | 'importance' | 'updatedAt' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

export default function FolderPage() {
  const params = useParams();
  const folderId = params.folderId as string;

  const { hasPermission } = usePermissions(); // Plus de isLoading

  const [folder, setFolder] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  useEffect(() => {
    fetchFolder();
    fetchReports();
  }, [folderId]);

  const fetchFolder = async () => {
    try {
      const response = await fetch(`/api/folders/${folderId}`);
      if (response.ok) {
        const data = await response.json();
        setFolder(data);
      }
    } catch (error) {
      console.error("Erreur chargement dossier:", error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/reports?folderId=${folderId}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error("Erreur chargement rapports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (data: any) => {
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, folderId }),
      });

      if (!response.ok) throw new Error("Erreur création");

      await fetchReports();
      setShowEditor(false);
    } catch (error) {
      console.error("Erreur création rapport:", error);
      throw error;
    }
  };

  const handleEditReport = async (data: any) => {
    if (!editingReport?._id) {
      console.error("Pas d'ID de rapport pour la modification");
      toast.error("Erreur: ID de rapport manquant");
      return;
    }

    try {
      console.log("Mise à jour du rapport:", editingReport._id, data);
      
      const response = await fetch(`/api/reports/${editingReport._id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const updatedReport = await response.json();
      console.log("Rapport mis à jour:", updatedReport);

      await fetchReports();
      setEditingReport(null);
      toast.success("Rapport mis à jour avec succès");
    } catch (error) {
      console.error("Erreur mise à jour rapport:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
      toast.error(errorMessage);
      throw error; // Re-throw pour que l'éditeur puisse gérer l'erreur
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erreur suppression");

      await fetchReports();
      toast.success("Rapport supprimé avec succès");
    } catch (error) {
      console.error("Erreur suppression rapport:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedAndFilteredReports = () => {
    const filtered = reports.filter((report) => {
      const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesImportance = filterImportance === 'all' || report.importance === filterImportance;
      
      return matchesSearch && matchesImportance;
    });

    return filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'importance':
          const importanceOrder = { low: 0, medium: 1, high: 2, critical: 3 };
          aVal = importanceOrder[a.importance as keyof typeof importanceOrder];
          bVal = importanceOrder[b.importance as keyof typeof importanceOrder];
          break;
        case 'updatedAt':
        case 'createdAt':
          aVal = new Date(a[sortField]).getTime();
          bVal = new Date(b[sortField]).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredAndSortedReports = getSortedAndFilteredReports();

  const handleSelectDraft = (draft: any) => {
    setEditingReport({
      ...draft,
      _id: null,
      draftId: draft._id
    });
  };

  if (loading) { // Seulement le loading des données
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (showEditor || editingReport) {
    return (
      <ReportEditor
        initialData={editingReport}
        onSave={editingReport ? handleEditReport : handleCreateReport}
        onCancel={() => {
          setShowEditor(false);
          setEditingReport(null);
        }}
        isEditing={!!editingReport}
        folderId={folderId}
        draftId={editingReport?.draftId}
      />
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{folder?.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowDrafts(true)} 
            className="cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-2" />
            Brouillons
          </Button>
          {hasPermission('createReports') && (
            <Button onClick={() => setShowEditor(true)} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau rapport
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des rapports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter by importance */}
          <Select value={filterImportance} onValueChange={setFilterImportance}>
            <SelectTrigger className="w-40 cursor-pointer">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">Toutes</SelectItem>
              {importanceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                  {option.icon} {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="cursor-pointer rounded-r-none"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="cursor-pointer rounded-l-none"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredAndSortedReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium mb-2">Aucun rapport</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterImportance !== 'all'
                ? "Aucun rapport ne correspond à vos filtres"
                : "Commencez par créer votre premier rapport"}
            </p>
            {!searchQuery && filterImportance === 'all' && hasPermission('createReports') && (
              <Button onClick={() => setShowEditor(true)} className="cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                Créer un rapport
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        // List View
        <div className="border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-card border-b px-6 py-3">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium">
              <div 
                className="col-span-5 flex items-center gap-2 hover:text-primary transition-colors group cursor-pointer"
                onClick={() => handleSort('title')}
              >
                <span>Titre</span>
                {sortField === 'title' ? (
                  <div className="bg-primary/10 text-primary rounded p-1">
                    {sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </div>
                ) : (
                  <div className="text-muted-foreground/40 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SortAsc className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div 
                className="col-span-2 flex items-center gap-2 hover:text-primary transition-colors group cursor-pointer"
                onClick={() => handleSort('importance')}
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  <span>Importance</span>
                </div>
                {sortField === 'importance' ? (
                  <div className="bg-primary/10 text-primary rounded p-1">
                    {sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </div>
                ) : (
                  <div className="text-muted-foreground/40 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SortAsc className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>Tags</span>
              </div>

              <div 
                className="col-span-2 flex items-center gap-2 hover:text-primary transition-colors group cursor-pointer"
                onClick={() => handleSort('updatedAt')}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Modifié</span>
                </div>
                {sortField === 'updatedAt' ? (
                  <div className="bg-primary/10 text-primary rounded p-1">
                    {sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </div>
                ) : (
                  <div className="text-muted-foreground/40 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SortAsc className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="col-span-1"></div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y">
            {filteredAndSortedReports.map((report) => {
              const importance = importanceOptions.find((opt) => opt.value === report.importance);
              return (
                <div
                  key={report._id}
                  className="px-6 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setEditingReport(report)}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Title */}
                    <div className="col-span-5 flex items-center gap-3">
                      <span className="text-lg">{report.icon}</span>
                      <div>
                        <div className="font-medium">{report.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {report.content.substring(0, 80)}...
                        </div>
                      </div>
                    </div>

                    {/* Importance */}
                    <div className="col-span-2">
                      {importance && (
                        <Badge className={`${importance.color} border`} variant="outline">
                          {importance.icon} {importance.label}
                        </Badge>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="col-span-2 flex flex-wrap gap-1">
                      {report.tags.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {report.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{report.tags.length - 2}
                        </Badge>
                      )}
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {new Date(report.updatedAt).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end">
                      <DropdownMenu>  
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* MODIFICATION: Tous les membres peuvent modifier */}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingReport(report);
                            }}
                            className="cursor-pointer"
                          >
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* MODIFICATION: Tous les membres peuvent supprimer */}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportToDelete(report._id);
                            }}
                            className="text-destructive cursor-pointer"
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Grid View (existing card layout)
        <div className="grid gap-4">
          {filteredAndSortedReports.map((report) => {
            const importance = importanceOptions.find((opt) => opt.value === report.importance);
            return (
              <Card
                key={report._id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                style={{ backgroundColor: report.color }}
                onClick={() => setEditingReport(report)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p 
                      className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdownWithColors(report.content)
                      }}
                    />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.updatedAt).toLocaleDateString()}
                      </div>
                      {importance && (
                        <Badge className={`${importance.color} border`} variant="outline">
                          {importance.icon} {importance.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <DraftsDialog
        open={showDrafts}
        onClose={() => setShowDrafts(false)}
        onSelectDraft={handleSelectDraft}
        folderId={folderId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={reportToDelete !== null} onOpenChange={() => !isDeleting && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rapport ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce rapport ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && handleDeleteReport(reportToDelete)}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
