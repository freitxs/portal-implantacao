import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

export type AuthUser = { id: string; role: "ADMIN" | "CLIENT" };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Você precisa estar logado." });
  }
  const token = auth.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Sessão expirada. Faça login novamente." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Acesso restrito ao admin." });
  }
  next();
}
