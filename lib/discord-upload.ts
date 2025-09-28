const DISCORD_WEBHOOK = "https://canary.discord.com/api/webhooks/1420888439116533812/r4--yUIo_aITGMWSg8lLINz_k-vz___cMc5NMT8Osg-jduCKAvFAiVAbWCMkdUvmqXDF";

export async function uploadToDiscord(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(DISCORD_WEBHOOK + "?wait=true", {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.attachments[0].url;
}
