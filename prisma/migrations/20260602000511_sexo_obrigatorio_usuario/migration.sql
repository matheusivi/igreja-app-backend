/*
  Warnings:

  - Made the column `sexo` on table `usuarios` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "sexo" SET NOT NULL;
