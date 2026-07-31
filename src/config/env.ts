import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),
  PORT: z.string().default("3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  ALLOWED_ORIGINS: z.string().optional(),
  PAYLOAD_SIZE: z.string().default("100kb"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY é obrigatória"),
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL é obrigatória"),

  // Cloudinary — hospedagem das imagens (foto de perfil, capas etc.).
  // Opcionais de propósito: sem elas o servidor sobe normalmente e apenas o
  // upload fica indisponível, com mensagem clara. Assim ninguém precisa
  // configurar Cloudinary para rodar o projeto localmente.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
