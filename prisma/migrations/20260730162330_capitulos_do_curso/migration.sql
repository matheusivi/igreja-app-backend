-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "duracao" TEXT,
ADD COLUMN     "publicoAlvo" TEXT;

-- CreateTable
CREATE TABLE "capitulos_curso" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "secao" TEXT,

    CONSTRAINT "capitulos_curso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capitulos_curso_cursoId_idx" ON "capitulos_curso"("cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "capitulos_curso_cursoId_ordem_key" ON "capitulos_curso"("cursoId", "ordem");

-- CreateIndex
CREATE INDEX "salas_curso_cursoId_status_idx" ON "salas_curso"("cursoId", "status");

-- AddForeignKey
ALTER TABLE "capitulos_curso" ADD CONSTRAINT "capitulos_curso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
