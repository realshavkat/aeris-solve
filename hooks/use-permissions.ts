import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface UserPermissions {
  // Permissions dossiers
  viewDashboard: boolean;
  createFolders: boolean;
  editOwnFolders: boolean;
  editAllFolders: boolean;
  deleteOwnFolders: boolean;
  deleteAllFolders: boolean;
  
  // Permissions rapports
  createReports: boolean;
  editOwnReports: boolean;
  editAllReports: boolean;
  deleteOwnReports: boolean;
  deleteAllReports: boolean;
  
  // Autres permissions
  joinFolders: boolean;
  manageProfile: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  viewDashboard: false,
  createFolders: false,
  editOwnFolders: false,
  editAllFolders: false,
  deleteOwnFolders: false,
  deleteAllFolders: false,
  createReports: false,
  editOwnReports: false,
  editAllReports: false,
  deleteOwnReports: false,
  deleteAllReports: false,
  joinFolders: false,
  manageProfile: false,
};

// Cache global PLUS ROBUSTE
const globalCache = new Map<string, { data: UserPermissions; timestamp: number; fetching: boolean }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes au lieu de 5
const DEBOUNCE_TIME = 1000; // 1 seconde de debounce

export function usePermissions() {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [isLoading, setIsLoading] = useState(true);
  
  // Références pour éviter les effets de bord
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchPermissions = useCallback(async (userId: string, forceRefresh = false) => {
    // Éviter les requêtes si le composant est démonté
    if (!isMountedRef.current) return;

    const cacheKey = userId;
    const cached = globalCache.get(cacheKey);
    const now = Date.now();

    // Utiliser le cache si disponible et récent
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL) && !cached.fetching) {
      console.log('🎯 Utilisation du cache pour les permissions');
      setPermissions(cached.data);
      setIsLoading(false);
      return;
    }

    // Éviter les requêtes simultanées
    if (cached?.fetching) {
      console.log('⏳ Requête permissions déjà en cours...');
      return;
    }

    // Marquer comme en cours de récupération
    globalCache.set(cacheKey, { 
      data: cached?.data || DEFAULT_PERMISSIONS, 
      timestamp: cached?.timestamp || 0, 
      fetching: true 
    });

    try {
      console.log('🔄 Récupération des permissions pour:', userId);
      const response = await fetch('/api/user/permissions', {
        headers: { 'Cache-Control': 'max-age=300' } // Cache navigateur 5 min
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Mettre à jour le cache et l'état seulement si le composant est monté
      if (isMountedRef.current) {
        globalCache.set(cacheKey, { 
          data, 
          timestamp: now, 
          fetching: false 
        });
        setPermissions(data);
        console.log('✅ Permissions mises à jour');
      }
    } catch (error) {
      console.error('❌ Erreur permissions:', error);
      // Marquer comme non en cours même en cas d'erreur
      if (cached) {
        globalCache.set(cacheKey, { 
          data: cached.data, 
          timestamp: cached.timestamp, 
          fetching: false 
        });
      }
      if (isMountedRef.current) {
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fonction de refresh manuel
  const refreshPermissions = useCallback(async () => {
    if (!session?.user?.id) return;
    
    console.log('🔄 Refresh manuel des permissions');
    setIsLoading(true);
    await fetchPermissions(session.user.id, true);
  }, [session?.user?.id, fetchPermissions]);

  // Effet principal - SIMPLIFIÉ
  useEffect(() => {
    isMountedRef.current = true;
    
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (status === 'loading') return;
    
    if (status === 'unauthenticated' || !session?.user?.id) {
      setPermissions(DEFAULT_PERMISSIONS);
      setIsLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    const currentUserId = session.user.id;
    
    // Éviter les requêtes redondantes
    if (lastUserIdRef.current === currentUserId && !isLoading) {
      return;
    }

    lastUserIdRef.current = currentUserId;
    
    // DEBOUNCE la requête
    fetchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        fetchPermissions(currentUserId);
      }
    }, DEBOUNCE_TIME);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [session?.user?.id, status, fetchPermissions]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const hasPermission = useCallback((permission: keyof UserPermissions): boolean => {
    if (isLoading || !session?.user) return false;
    return permissions[permission] || false;
  }, [permissions, isLoading, session?.user]);

  return {
    permissions,
    hasPermission,
    isLoading,
    refreshPermissions
  };
}