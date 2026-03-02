import jwt from "jsonwebtoken";
import { env } from "./env.js";
import { z } from "zod";

const AccessPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["ADMIN", "CLIENT"]),
});

export type AccessPayload = z.infer<typeof AccessPayloadSchema>;

export function signAccessToken(payload: AccessPayload, expiresIn: string = "4h") {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn });
}

export function signRefreshToken(payload: { sub: string }, expiresIn: string = "30d") {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn });
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
  return AccessPayloadSchema.parse(decoded);
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
  return z.object({ sub: z.string() }).parse(decoded);
}
