import { NextFunction, Request, Response } from "express";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: "Rota não encontrada." });
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err?.status || 500;
  const message = err?.message || "Erro interno.";
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}
