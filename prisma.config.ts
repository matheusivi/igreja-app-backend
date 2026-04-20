// Configuração do Prisma v7 - necessário para migrations e CLI
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Caminho para o schema do Prisma
  schema: "prisma/schema.prisma",

  // Configuração de migrations
  migrations: {
    path: "prisma/migrations",
  },

  // Conexão com o banco de dados (usado pelo CLI para migrations)
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
