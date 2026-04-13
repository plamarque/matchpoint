/**
 * Indique si le fichier peut être affiché comme logo (<img> + data URL).
 * Les .svg sont souvent fournis avec type vide, text/plain ou octet-stream selon l’OS / le navigateur.
 */
export function isLogoImageFile(file: File): boolean {
  const type = file.type.trim().toLowerCase();
  if (type.startsWith("image/")) {
    return true;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".svg")) {
    return (
      type === "" ||
      type === "application/octet-stream" ||
      type === "text/plain" ||
      type === "text/xml" ||
      type === "application/xml"
    );
  }
  if (/\.(png|jpe?g|gif|webp|avif|bmp|ico)$/i.test(file.name)) {
    return type === "" || type === "application/octet-stream";
  }
  return false;
}
