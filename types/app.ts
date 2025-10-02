// src/types/app.ts
export type Importance = "low" | "medium" | "high" | "critical";
export type UserStatus = "needs_registration" | "pending" | "approved" | "rejected" | "banned";
export type UserRole = "visitor" | "member" | "admin";
export type MissionStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type MissionPriority = "low" | "medium" | "high" | "critical";
export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationImportance = "low" | "medium" | "high" | "critical";

export interface User {
  _id: string;
  id: string;
  discordId: string;
  discordUsername: string;
  discordDiscriminator?: string;
  avatar?: string | null;
  rpName?: string | null;
  anonymousNickname?: string | null;
  nickname?: string;
  role: UserRole;
  status: UserStatus;
  email?: string | null;
  name?: string;
  image?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Report {
  _id: string;
  title: string;
  content: string;
  importance: Importance;
  tags: string[];
  icon?: string;
  color: string;
  folderId: string;
  authorId: string;
  author: {
    name: string;
    discordId: string;
  };
  lastEditedBy?: {
    id: string;
    name: string;
    discordId: string;
    editedAt: Date;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Folder {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  accessKey?: string;
  ownerId: string;
  creator: {
    name: string;
    discordId: string;
  };
  members?: FolderMember[];
  reportsCount?: number;
  adminAccess?: boolean;
  createdAt: string | Date;
  lastModified: string | Date;
}

export interface FolderMember {
  id: string;
  name: string;
  image?: string | null;
}

export interface Mission {
  _id: string;
  title: string;
  description: string;
  priority: MissionPriority;
  status: MissionStatus;
  assignedUsers: AssignedUser[];
  createdBy: {
    id: string;
    name: string;
    discordId?: string;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
  dueDate?: string | Date;
  completedAt?: string | Date;
}

export interface AssignedUser {
  id: string;
  name: string;
  discordId?: string;
  assignedAt: string | Date;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: NotificationType;
  importance: NotificationImportance;
  userId: string;
  read: boolean;
  sender?: {
    name: string;
    id?: string;
  };
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface Draft {
  _id: string;
  title: string;
  content: string;
  importance: string;
  tags: string[];
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

// Types pour les formulaires
export interface CreateFolderData {
  title: string;
  description: string;
  coverImage?: string;
}

export interface UpdateFolderData {
  title?: string;
  description?: string;
  coverImage?: string | null;
}

export interface CreateMissionData {
  title: string;
  description: string;
  priority: MissionPriority;
  assignedUsers: string[];
  dueDate?: string;
}

export interface UpdateMissionData extends Partial<CreateMissionData> {
  status?: MissionStatus;
}

// Types pour les permissions
export type Permission = 
  | 'createFolders'
  | 'editOwnFolders'
  | 'editAllFolders'
  | 'deleteOwnFolders'
  | 'deleteAllFolders'
  | 'joinFolders'
  | 'createReports'
  | 'editOwnReports'
  | 'editAllReports'
  | 'deleteOwnReports'
  | 'deleteAllReports'
  | 'manageProfile'
  | 'viewAdmin'
  | 'manageUsers'
  | 'manageRoles'
  | 'sendNotifications'
  | 'createMissions'
  | 'editMissions'
  | 'deleteMissions'
  | 'assignMissions';

// Types pour les filtres et tri
export interface ReportFilters {
  search?: string;
  importance?: Importance | 'all';
  tags?: string[];
}

export interface FolderFilters {
  search?: string;
}

export type SortField = 'title' | 'importance' | 'updatedAt' | 'createdAt';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid';
