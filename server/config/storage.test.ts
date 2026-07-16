import { describe, expect, it, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { ENV } from "../_core/infra/env";
import { storagePut, storageDelete, resolveAttachmentPath } from "./storage";

afterEach(async () => {
  await fs.rm(path.resolve(ENV.uploadsDir), { recursive: true, force: true });
});

describe("storagePut", () => {
  it("escribe el archivo en UPLOADS_DIR y devuelve key/url", async () => {
    const result = await storagePut("incidents/INC-001/foto.jpg", Buffer.from("contenido"));
    expect(result.key).toBe("incidents/INC-001/foto.jpg");
    expect(result.url).toBe("/api/attachments/file/incidents/INC-001/foto.jpg");
    const written = await fs.readFile(resolveAttachmentPath("incidents/INC-001/foto.jpg"), "utf-8");
    expect(written).toBe("contenido");
  });

  it("crea subdirectorios que no existen", async () => {
    await storagePut("a/b/c/archivo.txt", Buffer.from("x"));
    const exists = await fs.access(resolveAttachmentPath("a/b/c/archivo.txt")).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});

describe("storageDelete", () => {
  it("borra un archivo existente", async () => {
    await storagePut("borrar-me.txt", Buffer.from("x"));
    await storageDelete("borrar-me.txt");
    const exists = await fs.access(resolveAttachmentPath("borrar-me.txt")).then(() => true).catch(() => false);
    expect(exists).toBe(false);
  });

  it("no lanza si el archivo ya no existe", async () => {
    await expect(storageDelete("nunca-existio.txt")).resolves.toBeUndefined();
  });
});

describe("resolveAttachmentPath", () => {
  it("evita escapar de UPLOADS_DIR con ../../", () => {
    const resolved = resolveAttachmentPath("../../etc/passwd");
    expect(resolved.startsWith(path.resolve(ENV.uploadsDir))).toBe(false);
  });
});
