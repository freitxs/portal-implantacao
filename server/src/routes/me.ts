import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(401).json({ message: "Usuário não encontrado." });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (e) { next(e); }
});

export default router;
