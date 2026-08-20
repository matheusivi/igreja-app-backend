-- Progresso do plano de leitura anual.
--
-- Uma linha por dia LIDO. A ausência da linha já significa "não lido", então
-- o banco guarda só o que aconteceu, em vez de 365 registros por pessoa
-- nascendo falsos no dia do cadastro.
--
-- `dia` é texto YYYY-MM-DD, não DATE: aqui a data é um rótulo do plano, não
-- um instante. Guardar como timestamp obrigaria a escolher um fuso, e o mesmo
-- registro voltaria como dia 4 ou dia 5 conforme onde a consulta rodasse.
CREATE TABLE "leituras_plano" (
  "id"          SERIAL PRIMARY KEY,
  "usuarioId"   INTEGER NOT NULL,
  "dia"         VARCHAR(10) NOT NULL,
  "concluidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "leituras_plano_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Marcar duas vezes o mesmo dia não pode virar dois registros: o progresso é
-- contado por linhas, e a duplicata inflaria o número sem ninguém notar.
CREATE UNIQUE INDEX "leituras_plano_usuarioId_dia_key"
  ON "leituras_plano"("usuarioId", "dia");

-- A tela sempre pergunta "o que ESTA pessoa leu neste ano".
CREATE INDEX "leituras_plano_usuarioId_dia_idx"
  ON "leituras_plano"("usuarioId", "dia");
