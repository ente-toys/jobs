import { roleArtworkByTeam } from "./assets";

export function getRoleArtwork(team: string) {
  return roleArtworkByTeam[team.trim().toLowerCase()] ?? null;
}
