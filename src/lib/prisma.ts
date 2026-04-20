// Módulo de conexão com o banco de dados usando Prisma v7 + Driver Adapter
// O import abaixo garante que as variáveis do .env estejam carregadas
// ANTES de criar o pool de conexões (necessário em projetos ESM)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Cria o pool de conexões com o PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Cria o adapter do Prisma para PostgreSQL
const adapter = new PrismaPg(pool);

// Instancia o PrismaClient com o adapter (obrigatório no Prisma v7)
export const prisma = new PrismaClient({ adapter });
    