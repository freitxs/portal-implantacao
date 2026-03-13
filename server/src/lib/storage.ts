import fs from "fs";
import path from "path";
import { env } from "./env.js";
import { nanoid } from "nanoid";

/**
 * Storage local (dev). Estruturado para trocar por S3 futuramente.
 */
export class LocalStorage {
  baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(this.baseDir)) fs.mkdirSync(this.baseDir, { recursive: true });
  }

  ensureFormDir(formId: string) {
    const dir = path.join(this.baseDir, formId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  buildFilename(originalName: string) {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]+/g, "_");
    return `${nanoid(10)}_${safe}`;
  }
}

export const storage = new LocalStorage();
