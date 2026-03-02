import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  CORS_ORIGIN: z.string().min(1),
  UPLOAD_DIR: z.string().min(1),
  PORT: z.coerce.number().default(4000),
});

export const env = EnvSchema.parse(process.env);
