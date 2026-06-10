/*
  Warnings:

  - Added the required column `criadorUsuarioId` to the `grupos_familiares` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "grupos_familiares" ADD COLUMN     "criadorUsuarioId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "sexo" TEXT;

-- AddForeignKey
ALTER TABLE "grupos_familiares" ADD CONSTRAINT "grupos_familiares_criadorUsuarioId_fkey" FOREIGN KEY ("criadorUsuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
