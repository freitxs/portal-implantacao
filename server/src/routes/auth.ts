import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import bcrypt from "bcryptjs";

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "E-mail ou senha inválidos." });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "E-mail ou senha inválidos." });

    const role = (user.role === "ADMIN" || user.role === "CLIENT") ? user.role : "CLIENT";
    const accessToken = signAccessToken({ sub: user.id, role });
    const refreshToken = signRefreshToken({ sub: user.id });

    // store refresh token hashed (simple session store)
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30d
    await prisma.refreshSession.create({ data: { userId: user.id, tokenHash, expiresAt } });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) { next(e); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const schema = z.object({ refreshToken: z.string().min(10) });
    const { refreshToken } = schema.parse(req.body);

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ message: "Sessão inválida." });

    // find matching session by comparing hash
    const sessions = await prisma.refreshSession.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    let matched = false;
    for (const s of sessions) {
      const ok = await bcrypt.compare(refreshToken, s.tokenHash);
      if (ok) { matched = true; break; }
    }
    if (!matched) return res.status(401).json({ message: "Sessão inválida." });

    const role = (user.role === "ADMIN" || user.role === "CLIENT") ? user.role : "CLIENT";
    const accessToken = signAccessToken({ sub: user.id, role });
    res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.post("/logout", async (req, res, next) => {
  try {
    const schema = z.object({ refreshToken: z.string().min(10) });
    const { refreshToken } = schema.parse(req.body);

    const payload = verifyRefreshToken(refreshToken);

    // delete sessions that match (best-effort)
    const sessions = await prisma.refreshSession.findMany({
      where: { userId: payload.sub },
      take: 50,
    });

    const idsToDelete: string[] = [];
    for (const s of sessions) {
      const ok = await bcrypt.compare(refreshToken, s.tokenHash);
      if (ok) idsToDelete.push(s.id);
    }
    if (idsToDelete.length) await prisma.refreshSession.deleteMany({ where: { id: { in: idsToDelete } } });

    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
