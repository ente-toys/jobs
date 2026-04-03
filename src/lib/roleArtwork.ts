const roleArtworkByTeam: Record<string, string> = {
  engineering: "/role-art/engineering.png",
  marketing: "/role-art/marketing.png",
  video: "/role-art/video.png",
};

export function getRoleArtwork(team: string) {
  return roleArtworkByTeam[team.trim().toLowerCase()] ?? null;
}
