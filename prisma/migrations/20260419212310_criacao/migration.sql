-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "perfil" TEXT NOT NULL DEFAULT 'Membro',
    "dataNascimento" TIMESTAMP(3),
    "exibirAniversario" BOOLEAN NOT NULL DEFAULT true,
    "estadoCivil" TEXT,
    "fotoUrl" TEXT,
    "profissao" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT,
    "imagemUrl" TEXT,
    "videoUrl" TEXT,
    "formato" TEXT NOT NULL,
    "dataPublicacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "dataValidade" TIMESTAMP(3),

    CONSTRAINT "conteudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_oracao" (
    "id" SERIAL NOT NULL,
    "autorUsuarioId" INTEGER NOT NULL,
    "descricaoPedido" TEXT NOT NULL,
    "dataEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibilidade" TEXT NOT NULL DEFAULT 'todos',

    CONSTRAINT "pedidos_oracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" SERIAL NOT NULL,
    "criadorUsuarioId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricaoMaterial" TEXT,
    "categoria" TEXT NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salas_curso" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "nomeSala" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ativa',

    CONSTRAINT "salas_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_cursos" (
    "usuarioId" INTEGER NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "dataAdicao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "usuarios_cursos_pkey" PRIMARY KEY ("usuarioId","cursoId")
);

-- CreateTable
CREATE TABLE "usuarios_salas" (
    "salaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "dataMatricula" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ativo',

    CONSTRAINT "usuarios_salas_pkey" PRIMARY KEY ("salaId","usuarioId")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "conteudos" ADD CONSTRAINT "conteudos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_oracao" ADD CONSTRAINT "pedidos_oracao_autorUsuarioId_fkey" FOREIGN KEY ("autorUsuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_criadorUsuarioId_fkey" FOREIGN KEY ("criadorUsuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salas_curso" ADD CONSTRAINT "salas_curso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_cursos" ADD CONSTRAINT "usuarios_cursos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_cursos" ADD CONSTRAINT "usuarios_cursos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_salas" ADD CONSTRAINT "usuarios_salas_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "salas_curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_salas" ADD CONSTRAINT "usuarios_salas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
