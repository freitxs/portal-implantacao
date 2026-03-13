import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { storage as localStorage } from "../lib/storage.js";

const router = Router();

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const allowed = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const formId = req.params.id;
      const dir = localStorage.ensureFormDir(formId);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, localStorage.buildFilename(file.originalname));
    },
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(new Error("Tipo de arquivo inválido. Envie PDF/DOC/DOCX."));
    }
    cb(null, true);
  },
});

function canAccessForm(user: {id: string; role: "ADMIN"|"CLIENT"}, form: {userId: string}) {
  return user.role === "ADMIN" || form.userId === user.id;
}

router.post("/:id/uploads/:type", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const type = z.enum(["CONTRATO", "PROPOSTA"]).parse(req.params.type);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    if (!req.file) return res.status(400).json({ message: "Arquivo não enviado." });

    // remove previous if exists
    const existing = await prisma.upload.findUnique({ where: { formId_type: { formId: form.id, type } } });
    if (existing) {
      try { fs.unlinkSync(existing.path); } catch {}
      await prisma.upload.delete({ where: { id: existing.id } });
    }

    const created = await prisma.upload.create({
      data: {
        formId: form.id,
        type,
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });

    res.json({ upload: created });
  } catch (e) { next(e); }
});

router.delete("/:id/uploads/:type", requireAuth, async (req, res, next) => {
  try {
    const type = z.enum(["CONTRATO", "PROPOSTA"]).parse(req.params.type);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const existing = await prisma.upload.findUnique({ where: { formId_type: { formId: form.id, type } } });
    if (!existing) return res.json({ ok: true });

    try { fs.unlinkSync(existing.path); } catch {}
    await prisma.upload.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/download/:uploadId", requireAuth, async (req, res, next) => {
  try {
    const uploadId = req.params.uploadId;
    const up = await prisma.upload.findUnique({ where: { id: uploadId }, include: { form: true } });
    if (!up) return res.status(404).json({ message: "Arquivo não encontrado." });

    if (!canAccessForm(req.user!, up.form)) return res.status(403).json({ message: "Sem permissão." });

    res.download(path.resolve(up.path), up.filename);
  } catch (e) { next(e); }
});

export default router;
