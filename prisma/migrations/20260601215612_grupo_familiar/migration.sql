-- CreateTable
CREATE TABLE "grupos_familiares" (
    "id" SERIAL NOT NULL,
    "nome" TEXT,

    CONSTRAINT "grupos_familiares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_familia" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "grupoFamiliarId" INTEGER NOT NULL,
    "parentesco" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "convidadoPorId" INTEGER NOT NULL,

    CONSTRAINT "membros_familia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membros_familia_usuarioId_grupoFamiliarId_key" ON "membros_familia"("usuarioId", "grupoFamiliarId");

-- AddForeignKey
ALTER TABLE "membros_familia" ADD CONSTRAINT "membros_familia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_familia" ADD CONSTRAINT "membros_familia_grupoFamiliarId_fkey" FOREIGN KEY ("grupoFamiliarId") REFERENCES "grupos_familiares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_familia" ADD CONSTRAINT "membros_familia_convidadoPorId_fkey" FOREIGN KEY ("convidadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
