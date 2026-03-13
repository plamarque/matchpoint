/**
 * Origine + base path de l'app (pour le QR code vers /control).
 * En prod déployé : ex. https://plamarque.github.io/matchpoint
 * En dev : ex. http://localhost:5173
 */
const base = typeof import.meta !== "undefined" ? (import.meta.env?.BASE_URL ?? "/") : "/";
const basePath = base.endsWith("/") ? base.slice(0, -1) : base;
export const REMOTE_CONTROL_ORIGIN =
  (typeof import.meta !== "undefined" && (import.meta.env as { VITE_REMOTE_CONTROL_ORIGIN?: string })?.VITE_REMOTE_CONTROL_ORIGIN) ||
  (typeof location !== "undefined" ? `${location.origin}${basePath}` : "https://plamarque.github.io/matchpoint");

/**
 * Construit l’URL de la page contrôle pour le QR code (session distante).
 * joinCode : code retourné par le backend (session:created).
 */
export function buildControlAppUrl(joinCode: string, appOrigin?: string): string {
  const base = (appOrigin ?? REMOTE_CONTROL_ORIGIN).replace(/\/$/, "");
  return `${base}/control?code=${encodeURIComponent(joinCode)}`;
}
