-- AlterTable
ALTER TABLE "salas_curso" ADD COLUMN     "capacidade" INTEGER,
ADD COLUMN     "liderUsuarioId" INTEGER;

-- AddForeignKey
ALTER TABLE "salas_curso" ADD CONSTRAINT "salas_curso_liderUsuarioId_fkey" FOREIGN KEY ("liderUsuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
