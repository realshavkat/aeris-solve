export interface Permission {
  key: string;
  label: string;
  description: string;
}

export const availablePermissions: Permission[] = [
  { key: 'viewDashboard', label: 'Voir le tableau de bord', description: 'Accès au tableau de bord principal' },
  { key: 'createFolders', label: 'Créer des dossiers', description: 'Peut créer de nouveaux dossiers' },
  { key: 'editOwnFolders', label: 'Modifier ses dossiers', description: 'Peut modifier ses propres dossiers' },
  { key: 'editAllFolders', label: 'Modifier tous les dossiers', description: 'Peut modifier tous les dossiers' },
  { key: 'deleteOwnFolders', label: 'Supprimer ses dossiers', description: 'Peut supprimer ses propres dossiers' },
  { key: 'deleteAllFolders', label: 'Supprimer tous les dossiers', description: 'Peut supprimer tous les dossiers' },
  { key: 'createReports', label: 'Créer des rapports', description: 'Peut créer de nouveaux rapports' },
  { key: 'editOwnReports', label: 'Modifier ses rapports', description: 'Peut modifier ses propres rapports' },
  { key: 'editAllReports', label: 'Modifier tous les rapports', description: 'Peut modifier tous les rapports' },
  { key: 'deleteOwnReports', label: 'Supprimer ses rapports', description: 'Peut supprimer ses propres rapports' },
  { key: 'deleteAllReports', label: 'Supprimer tous les rapports', description: 'Peut supprimer tous les rapports' },
  { key: 'joinFolders', label: 'Rejoindre des dossiers', description: 'Peut rejoindre des dossiers avec une clé' },
  { key: 'manageProfile', label: 'Gérer son profil', description: 'Peut modifier son profil utilisateur' }
];

// Permissions par défaut pour les rôles de base
export const defaultRolePermissions = {
  visitor: {
    viewDashboard: true,
    joinFolders: true,
    manageProfile: true
  },
  member: {
    viewDashboard: true,
    createFolders: true,
    editOwnFolders: true,
    deleteOwnFolders: true,
    createReports: true,
    editOwnReports: true,
    deleteOwnReports: true,
    joinFolders: true,
    manageProfile: true
  },
  admin: {
    viewDashboard: true,
    createFolders: true,
    editOwnFolders: true,
    editAllFolders: true,
    deleteOwnFolders: true,
    deleteAllFolders: true,
    createReports: true,
    editOwnReports: true,
    editAllReports: true,
    deleteOwnReports: true,
    deleteAllReports: true,
    joinFolders: true,
    manageProfile: true
  }
};

// Fonction principale pour vérifier les permissions (utilisée par les hooks)
export function hasPermission(userRole: string, userPermissions: Record<string, boolean>, permission: string): boolean {
  // Si l'utilisateur a des permissions personnalisées, les utiliser
  if (userPermissions && Object.keys(userPermissions).length > 0) {
    return userPermissions[permission] === true;
  }
  
  // Sinon, utiliser les permissions par défaut du rôle
  const rolePermissions = defaultRolePermissions[userRole as keyof typeof defaultRolePermissions];
  return rolePermissions ? rolePermissions[permission as keyof typeof rolePermissions] === true : false;
}

// Fonction pour récupérer les permissions d'un utilisateur depuis l'API
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const response = await fetch(`/api/users/${userId}/permissions`);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Si l'utilisateur a des permissions personnalisées, les retourner
    if (data.customPermissions && Object.keys(data.customPermissions).length > 0) {
      return Object.keys(data.customPermissions).filter(
        permission => data.customPermissions[permission] === true
      );
    }
    
    // Sinon, retourner les permissions par défaut du rôle
    const userRole = data.role || 'visitor';
    const rolePermissions = defaultRolePermissions[userRole as keyof typeof defaultRolePermissions];
    
    if (rolePermissions) {
      return Object.keys(rolePermissions).filter(
        permission => rolePermissions[permission as keyof typeof rolePermissions] === true
      );
    }
    
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    // En cas d'erreur, retourner les permissions minimales (visitor)
    return Object.keys(defaultRolePermissions.visitor).filter(
      permission => defaultRolePermissions.visitor[permission as keyof typeof defaultRolePermissions.visitor] === true
    );
  }
}

// Fonction utilitaire pour vérifier si un utilisateur a une permission spécifique
export async function userHasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permission);
}
