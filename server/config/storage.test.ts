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
  it("lanza si la ruta escapa de UPLOADS_DIR con ../../", () => {
    expect(() => resolveAttachmentPath("../../etc/passwd")).toThrow(/escapes/);
  });

  it("resuelve rutas normales sin lanzar", () => {
    expect(() => resolveAttachmentPath("incidents/INC-001/foto.jpg")).not.toThrow();
  });
});

describe("path traversal — storagePut/storageDelete rechazan escapes", () => {
  it("storagePut lanza con una key que intenta escapar de UPLOADS_DIR", async () => {
    await expect(storagePut("../../../etc/cron.d/evil", Buffer.from("x"))).rejects.toThrow(/escapes/);
  });

  it("storageDelete lanza con una key que intenta escapar de UPLOADS_DIR", async () => {
    await expect(storageDelete("../../../etc/passwd")).rejects.toThrow(/escapes/);
  });
});

describe("rutas absolutas — rechazadas antes de resolver (Windows y POSIX)", () => {
  it("rechaza una ruta con letra de unidad de Windows (path.resolve la trataría como absoluta, ignorando UPLOADS_DIR)", () => {
    expect(() => resolveAttachmentPath("C:\\Windows\\System32\\drivers\\etc\\hosts")).toThrow(/must be relative/);
  });

  it("rechaza una ruta UNC de Windows", () => {
    expect(() => resolveAttachmentPath("\\\\server\\share\\secreto.txt")).toThrow(/must be relative/);
  });

  it("rechaza una ruta absoluta POSIX", () => {
    expect(() => resolveAttachmentPath("/etc/passwd")).toThrow(/must be relative/);
  });

  it("storagePut rechaza una key con letra de unidad", async () => {
    await expect(storagePut("C:\\temp\\evil.txt", Buffer.from("x"))).rejects.toThrow(/must be relative/);
  });
});
