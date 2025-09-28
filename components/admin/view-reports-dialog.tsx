"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Calendar, 
  Tag, 
  User, 
  Search,
  Eye,
  Settings,
  Trash2
} from "lucide-react";
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
import { MoreHorizontal } from "lucide-react";

interface Report {
  _id: string;
  title: string;
  content: string;
  importance: string;
  tags: string[];
  color: string;
  icon: string;
  author: {
    name: string;
    discordId: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ViewReportsDialogProps {
  folder: {
    _id: string;
    title: string;
  };
  open: boolean;
  onClose: () => void;
  onReportDeleted: () => void;
}

const importanceOptions = [
  { value: 'low', label: 'Faible', color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200', icon: '🟢' },
  { value: 'medium', label: 'Moyen', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200', icon: '🟡' },
  { value: 'high', label: 'Élevé', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200', icon: '🟠' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200', icon: '🔴' }
];

export function ViewReportsDialog({ folder, open, onClose, onReportDeleted }: ViewReportsDialogProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchReports();
    }
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports?folderId=${folder._id}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        throw new Error('Erreur chargement rapports');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/reports/${report._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReports(prev => prev.filter(r => r._id !== report._id));
        toast.success('Rapport supprimé avec succès');
        onReportDeleted();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    report.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClose = () => {
    setSearchQuery("");
    setViewingReport(null);
    onClose();
  };

  // Dialog pour voir un rapport en détail
  if (viewingReport) {
    return (
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{viewingReport.icon}</span>
              {viewingReport.title}
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Settings className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-4">
              {/* Métadonnées */}
              <div className="flex flex-wrap gap-2">
                {importanceOptions.find(opt => opt.value === viewingReport.importance) && (
                  <Badge className={importanceOptions.find(opt => opt.value === viewingReport.importance)!.color}>
                    {importanceOptions.find(opt => opt.value === viewingReport.importance)!.icon}{' '}
                    {importanceOptions.find(opt => opt.value === viewingReport.importance)!.label}
                  </Badge>
                )}
                
                <Badge variant="outline">
                  <User className="w-3 h-3 mr-1" />
                  {viewingReport.author.name}
                </Badge>
                
                <Badge variant="outline">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(viewingReport.createdAt).toLocaleDateString()}
                </Badge>
              </div>

              {/* Tags */}
              {viewingReport.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {viewingReport.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Contenu */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap bg-muted/20 p-4 rounded-lg">
                  {viewingReport.content}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              onClick={() => setReportToDelete(viewingReport)}
              className="cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
            <Button onClick={() => setViewingReport(null)} className="cursor-pointer">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Rapports de &quot;{folder.title}&quot;
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Settings className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des rapports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Liste des rapports */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {searchQuery ? "Aucun rapport ne correspond à votre recherche" : "Aucun rapport dans ce dossier"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReports.map((report) => {
                    const importance = importanceOptions.find(opt => opt.value === report.importance);
                    
                    return (
                      <div
                        key={report._id}
                        className="p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{report.icon}</span>
                              <h3 className="font-medium truncate">{report.title}</h3>
                              {importance && (
                                <Badge className={`${importance.color} border text-xs`} variant="outline">
                                  {importance.icon}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {report.content.substring(0, 150)}...
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {report.author.name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(report.createdAt).toLocaleDateString()}
                              </div>
                              {report.tags.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {report.tags.length} tag{report.tags.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="cursor-pointer">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewingReport(report)}
                                className="cursor-pointer"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Voir en détail
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setReportToDelete(report)}
                                className="text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {filteredReports.length} rapport{filteredReports.length !== 1 ? 's' : ''} trouvé{filteredReports.length !== 1 ? 's' : ''}
            </div>
            <Button onClick={handleClose} className="cursor-pointer">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!reportToDelete} onOpenChange={() => !isDeleting && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rapport ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le rapport &quot;{reportToDelete?.title}&quot; ?
              Cette action est irréversible.
              <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950 rounded border-l-4 border-orange-500 text-sm">
                <strong>Action d&apos;administrateur :</strong> Vous supprimez un rapport qui ne vous appartient pas.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="cursor-pointer">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && handleDeleteReport(reportToDelete)}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
