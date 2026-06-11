-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "tipo" TEXT NOT NULL DEFAULT 'Outro',
    "cor" TEXT,
    "recorrencia" TEXT NOT NULL DEFAULT 'nenhuma',
    "diaSemana" INTEGER,
    "diaDoMes" INTEGER,
    "dataFimRecorrencia" TIMESTAMP(3),
    "criadorId" INTEGER NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_criadorId_fkey" FOREIGN KEY ("criadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
