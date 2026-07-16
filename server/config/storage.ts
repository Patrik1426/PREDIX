// Almacenamiento local de adjuntos — reemplaza el proxy de storage del
// scaffold "Manus" (BUILT_IN_FORGE_API_URL/KEY), retirado del proyecto.
// Requisito legal del cliente: los datos deben residir en servidores
// físicos propios (On-Premise), nunca en cloud de terceros.

import { promises as fs } from "fs";
import path from "path";
import { ENV } from "../_core/infra/env";

function resolveUploadsDir(): string {
  return path.resolve(ENV.uploadsDir);
}

export function resolveAttachmentPath(relKey: string): string {
  const uploadsDir = resolveUploadsDir();
  return path.resolve(uploadsDir, relKey.replace(/^\/+/, ""));
}

export async function storagePut(
  relKey: string,
  data: Buffer,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const fullPath = path.join(resolveUploadsDir(), key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, data);
  return { key, url: `/api/attachments/file/${key}` };
}

export async function storageDelete(relKey: string): Promise<void> {
  const fullPath = path.join(resolveUploadsDir(), relKey.replace(/^\/+/, ""));
  await fs.unlink(fullPath).catch(() => {
    // No lanza si el archivo ya no existe — borrar algo que no está no es un error.
  });
}
