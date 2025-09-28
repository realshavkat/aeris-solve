interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  author?: {
    name: string;
    icon_url?: string;
  };
}

// Webhooks pour chaque catégorie
const WEBHOOKS = {
  FOLDERS: 'https://canary.discord.com/api/webhooks/1421754625245184041/4_arqY6HOaybYbX2sO2Yvh9-f7C8ABHNP7eqfc5Rv1Cd_ms9TeGX92HSiKysDAWfjURy',
  REPORTS: 'https://canary.discord.com/api/webhooks/1421754767205466195/HyTsMLxze2hTN7W_9Z1sB5iIZc_BEKEg8BnM9SwEximHJRW4sBB47j-GGLgPXoDlzGwr',
  MISSIONS: 'https://canary.discord.com/api/webhooks/1421754776495980654/OpoeOPwuJGHamnQOQVCtoc-lhk9qamPX-kcVSt-K1X5D_k62fr7vanW--3fnZBjUaEGL'
} as const;

// Couleurs des embeds
const COLORS = {
  CREATE: 0x00ff00,    // Vert
  UPDATE: 0xffaa00,    // Orange
  DELETE: 0xff0000,    // Rouge
  COMPLETE: 0x0099ff,  // Bleu
  CANCEL: 0x888888     // Gris
} as const;

class DiscordLogger {
  private webhooks: Record<string, string>;

  constructor() {
    this.webhooks = {
      // Webhook principal (fallback)
      default: process.env.DISCORD_LOG_WEBHOOK_URL || '',
      // Webhooks spécialisés
      admin: process.env.DISCORD_ADMIN_WEBHOOK_URL || process.env.DISCORD_LOG_WEBHOOK_URL || '',
      missions: process.env.DISCORD_MISSION_WEBHOOK_URL || process.env.DISCORD_LOG_WEBHOOK_URL || '',
      folders: process.env.DISCORD_FOLDER_WEBHOOK_URL || process.env.DISCORD_LOG_WEBHOOK_URL || '',
      reports: process.env.DISCORD_REPORT_WEBHOOK_URL || process.env.DISCORD_LOG_WEBHOOK_URL || ''
    };
  }

  private async sendLog(embed: any, webhookType: string = 'default') {
    const webhookUrl = this.webhooks[webhookType];
    
    if (!webhookUrl) {
      console.warn(`Discord webhook URL not configured for type: ${webhookType}`);
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed]
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send Discord log to ${webhookType}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error sending Discord log to ${webhookType}:`, error);
    }
  }

  // Logs pour les dossiers
  async logFolderCreated(
    user: { name: string; discordId: string },
    folder: { title: string; description: string; _id: string }
  ) {
    const embed = {
      title: "📁 Nouveau dossier créé",
      color: 0x00ff00,
      fields: [
        { name: "Titre", value: folder.title, inline: false },
        { name: "Description", value: folder.description.length > 100 ? folder.description.substring(0, 100) + "..." : folder.description, inline: false },
        { name: "Créé par", value: user.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${folder._id}` }
    };

    await this.sendLog(embed, 'folders');
  }

  async logFolderUpdated(
    user: { name: string; discordId: string },
    folder: { title: string; _id: string },
    changes: Record<string, { old: any; new: any }>
  ) {
    const changesList = Object.entries(changes).map(([key, change]) => {
      return `**${key}**: ${change.old} → ${change.new}`;
    }).join('\n');

    const embed = {
      title: "📝 Dossier modifié",
      color: 0xffa500,
      fields: [
        { name: "Dossier", value: folder.title, inline: false },
        { name: "Changements", value: changesList || "Aucun changement détaillé", inline: false },
        { name: "Modifié par", value: user.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${folder._id}` }
    };

    await this.sendLog(embed, 'folders');
  }

  async logFolderDeleted(
    user: { name: string; discordId: string },
    folder: { title: string; _id: string; reportsCount: number }
  ) {
    const embed = {
      title: "🗑️ Dossier supprimé",
      color: 0xff0000,
      fields: [
        { name: "Dossier supprimé", value: folder.title, inline: false },
        { name: "Rapports supprimés", value: folder.reportsCount.toString(), inline: true },
        { name: "Supprimé par", value: user.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${folder._id}` }
    };

    await this.sendLog(embed, 'folders');
  }

  // Logs pour les rapports
  async logReportCreated(
    user: { name: string; discordId: string },
    report: { title: string; _id: string; importance: string },
    folder: { title: string; _id: string }
  ) {
    const embed = {
      title: "📄 Nouveau rapport créé",
      color: 0x00ff00,
      fields: [
        { name: "Titre", value: report.title, inline: false },
        { name: "Dossier", value: folder.title, inline: true },
        { name: "Importance", value: report.importance, inline: true },
        { name: "Créé par", value: user.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `Rapport ID: ${report._id} | Dossier ID: ${folder._id}` }
    };

    await this.sendLog(embed, 'reports');
  }

  async logReportUpdated(
    user: { name: string; discordId: string },
    report: { title: string; _id: string },
    changes: Record<string, { old: any; new: any }>,
    folder: { title: string }
  ) {
    const changesList = Object.entries(changes).map(([key, change]) => {
      if (key === 'content') {
        return `**${key}**: Contenu modifié`;
      }
      return `**${key}**: ${change.old} → ${change.new}`;
    }).join('\n');

    const embed = {
      title: "📝 Rapport modifié",
      color: 0xffa500,
      fields: [
        { name: "Rapport", value: report.title, inline: false },
        { name: "Dossier", value: folder.title, inline: true },
        { name: "Changements", value: changesList || "Aucun changement détaillé", inline: false },
        { name: "Modifié par", value: user.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${report._id}` }
    };

    await this.sendLog(embed, 'reports');
  }

  async logReportDeleted(
    user: { name: string; discordId: string },
    report: { title: string; _id: string },
    folder: { title: string }
  ) {
    const embed = {
      title: "🗑️ Rapport supprimé",
      color: 0xff0000,
      fields: [
        { name: "Rapport supprimé", value: report.title, inline: false },
        { name: "Dossier", value: folder.title, inline: true },
        { name: "Supprimé par", value: user.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${report._id}` }
    };

    await this.sendLog(embed, 'reports');
  }

  // Logs pour les missions (créées par les utilisateurs)
  async logMissionCreated(
    user: { name: string; discordId: string },
    mission: { title: string; description: string; _id: string }
  ) {
    const embed = {
      title: "🎯 Nouvelle mission créée par un utilisateur",
      color: 0x00ff00,
      fields: [
        { name: "Titre", value: mission.title, inline: false },
        { name: "Description", value: mission.description.length > 100 ? mission.description.substring(0, 100) + "..." : mission.description, inline: false },
        { name: "Créée par", value: user.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${mission._id}` }
    };

    await this.sendLog(embed, 'missions');
  }

  // Logs pour les missions (créées par les admins)
  async logMissionCreatedByAdmin(
    admin: { name: string; discordId: string },
    mission: { title: string; description: string; _id: string; priority: string; assignedUsers: any[] }
  ) {
    const embed = {
      title: "🎯 Mission créée par un administrateur",
      color: 0x00ff00,
      fields: [
        { name: "Titre", value: mission.title, inline: false },
        { name: "Description", value: mission.description.length > 100 ? mission.description.substring(0, 100) + "..." : mission.description, inline: false },
        { name: "Priorité", value: mission.priority, inline: true },
        { name: "Utilisateurs assignés", value: mission.assignedUsers.length.toString(), inline: true },
        { name: "Créée par", value: admin.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${mission._id}` }
    };

    await this.sendLog(embed, 'admin');
  }

  async logMissionStatusChangedByAdmin(
    admin: { name: string; discordId: string },
    mission: { title: string; _id: string; oldStatus: string; newStatus: string }
  ) {
    const statusNames: { [key: string]: string } = {
      'in_progress': 'En cours',
      'completed': 'Terminée',
      'cancelled': 'Annulée'
    };

    const embed = {
      title: "🔄 Statut de mission modifié par un administrateur",
      color: 0xffa500,
      fields: [
        { name: "Mission", value: mission.title, inline: false },
        { name: "Ancien statut", value: statusNames[mission.oldStatus] || mission.oldStatus, inline: true },
        { name: "Nouveau statut", value: statusNames[mission.newStatus] || mission.newStatus, inline: true },
        { name: "Modifié par", value: admin.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${mission._id}` }
    };

    await this.sendLog(embed, 'admin');
  }

  async logMissionDeletedByAdmin(
    admin: { name: string; discordId: string },
    mission: { title: string; _id: string; assignedUsersCount: number }
  ) {
    const embed = {
      title: "🗑️ Mission supprimée par un administrateur",
      color: 0xff0000,
      fields: [
        { name: "Mission supprimée", value: mission.title, inline: false },
        { name: "Utilisateurs qui étaient assignés", value: mission.assignedUsersCount.toString(), inline: true },
        { name: "Supprimée par", value: admin.name, inline: true }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `ID: ${mission._id}` }
    };

    await this.sendLog(embed, 'admin');
  }
}

export const discordLogger = new DiscordLogger();
