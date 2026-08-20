import type {
  CreateEventoDTO,
  UpdateEventoDTO,
  EventoResponse,
  ListarEventosMesResponse,
  EventoOcorrencia,
  EventoComCriadorSimples,
} from "../dtos/evento.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { EventoRepository } from "../repository/evento.repository";
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";
import { Perfis } from "../constants/perfis";
import { extrairPublicId, removerImagem } from "../lib/cloudinary";
import { FUSO_IGREJA } from "../constants/igreja";

/**
 * Fuso da igreja. Fixo, e de propósito.
 *
 * O agendamento é de uma congregação em Nova Andradina/MS — o "dia" de um
 * evento é o dia LÁ, não o dia de onde o servidor estiver hospedado.
 *
 * O código usava `data.getDate()`, que responde no fuso do PROCESSO. Num VPS
 * em UTC (o padrão de praticamente todo provedor), um culto marcado para
 * 20:00 de segunda vira 23:00 UTC — ainda segunda, tudo bem. Mas o culto de
 * sábado às 21:00 vira 01:00 de DOMINGO em UTC, e o app mostraria o evento no
 * dia errado. O defeito só apareceria depois do deploy, e só nos eventos da
 * noite: o pior tipo de bug para rastrear.
 *
 * Fixar o fuso resolve isso e ainda torna o resultado igual em qualquer
 * máquina — o mesmo banco devolve o mesmo dia rodando local ou em produção.
 */
// Vem de `constants/igreja.ts`, junto com o resto do que é desta igreja:
// quem adapta o app para outra congregação edita um arquivo, não caça
// strings soltas pelos serviços.

/**
 * Dia do mês de um instante, lido no fuso da igreja.
 *
 * `Intl` é usado em vez de aritmética com offset porque ele conhece horário
 * de verão. O Brasil não tem hoje, mas já teve e pode voltar — e nesse dia
 * uma subtração fixa de 4 horas erraria por uma hora durante meio ano.
 *
 * ═══ EXPORTADA PARA TESTE, E SÓ ═══
 * Ninguém mais deve importar isto. O motivo de abrir é que o defeito que ela
 * conserta — culto de sábado à noite aparecendo no domingo — não tem como ser
 * exercitado pela API pública sem montar um mês inteiro de ocorrências, e um
 * teste que precisa de tanto andaime deixa de ser escrito.
 */
export function diaLocalDoEvento(data: Date): number {
  const formatador = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_IGREJA,
    day: "numeric",
  });
  return Number(formatador.format(data));
}


/**
 * Data de uma ocorrência: dia novo, MESMO HORÁRIO do evento original.
 *
 * A versão anterior usava `new Date(ano, mes - 1, dia)`, que é meia-noite. O
 * efeito: um culto semanal marcado para 19:30 aparecia com "00:00" em todas as
 * repetições, porque o card lê a hora de `dataInicio` — e a `dataInicio` da
 * ocorrência era meia-noite, não 19:30.
 *
 * Pior que o horário errado era a consequência silenciosa: a comparação
 * `data < evento.dataInicio` passava a comparar meia-noite do dia X com
 * 19:30 do dia X, o que é VERDADEIRO — e a primeira ocorrência, justamente a
 * do dia que a pessoa escolheu, era descartada.
 */
function comHorarioDoEvento(
  original: Date,
  ano: number,
  mes: number,
  dia: number,
): Date {
  return new Date(
    ano,
    mes - 1,
    dia,
    original.getHours(),
    original.getMinutes(),
    0,
    0,
  );
}

export class EventoService {
  private usuarioRepository: UsuarioRepository;
  private eventoRepository: EventoRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    eventoRepository?: EventoRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.eventoRepository = eventoRepository ?? new EventoRepository();
  }

  public async create(
    data: CreateEventoDTO,
    usuarioId: number,
  ): Promise<EventoResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    const destaqueHome = data.destaqueHome ?? false;

    // Só um evento pode estar em destaque na Home: ao marcar um novo,
    // os anteriores perdem o destaque.
    if (destaqueHome) {
      await this.eventoRepository.limparDestaques();
    }

    const novoEvento = await this.eventoRepository.criar({
      titulo: data.titulo,
      descricao: data.descricao || null,
      local: data.local || null,
      dataInicio: new Date(data.dataInicio),
      dataFim: data.dataFim ? new Date(data.dataFim) : null,
      tipo: data.tipo,
      cor: data.cor || null,
      recorrencia: data.recorrencia || "nenhuma",
      diaSemana: data.diaSemana ?? null,
      diaDoMes: data.diaDoMes ?? null,
      dataFimRecorrencia: data.dataFimRecorrencia
        ? new Date(data.dataFimRecorrencia)
        : null,
      destaqueHome,
      imagemUrl: data.imagemUrl || null,
      criador: { connect: { id: usuarioId } },
    });

    return this.formatarResponse(novoEvento);
  }

  public async getById(eventoId: number): Promise<EventoResponse> {
    const evento = await this.eventoRepository.buscarPorId(eventoId);
    if (!evento) throw new AppError("Evento não encontrado.", 404);

    return this.formatarResponse(evento);
  }

  public async listarPorMes(
    mes?: number,
    ano?: number,
  ): Promise<ListarEventosMesResponse> {
    const hoje = new Date();
    const mesConsultado = mes ?? hoje.getMonth() + 1;
    const anoConsultado = ano ?? hoje.getFullYear();

    const eventos = await this.eventoRepository.listarPorMesAno(
      mesConsultado,
      anoConsultado,
    );

    // gerar ocorrências do mês para eventos recorrentes
    const ocorrencias = this.gerarOcorrencias(
      eventos,
      mesConsultado,
      anoConsultado,
    );

    // agrupar por dia
    const porDia = new Map<number, EventoOcorrencia[]>();

    for (const ocorrencia of ocorrencias) {
      const dia = diaLocalDoEvento(ocorrencia.dataInicio);
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push(ocorrencia);
    }

    return {
      mes: mesConsultado,
      ano: anoConsultado,
      data: Array.from(porDia.entries())
        .sort(([a], [b]) => a - b)
        .map(([dia, eventos]) => ({ dia, eventos })),
    };
  }

  public async update(
    eventoId: number,
    data: UpdateEventoDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<EventoResponse> {
    const eventoExistente =
      await this.eventoRepository.buscarParaPermissao(eventoId);
    if (!eventoExistente) throw new AppError("Evento não encontrado.", 404);

    const podeAtualizar =
      eventoExistente.criadorId === usuarioId ||
      perfil === Perfis.ADMINISTRADOR ||
      perfil === Perfis.PASTOR;

    if (!podeAtualizar) {
      throw new AppError(
        "Você não tem permissão para atualizar este evento.",
        403,
      );
    }

    const updateData: Prisma.EventoUpdateInput = {};
    if (data.titulo !== undefined) updateData.titulo = data.titulo;
    if (data.descricao !== undefined) updateData.descricao = data.descricao;
    if (data.local !== undefined) updateData.local = data.local;
    if (data.dataInicio !== undefined)
      updateData.dataInicio = new Date(data.dataInicio);
    if (data.dataFim !== undefined)
      updateData.dataFim = data.dataFim ? new Date(data.dataFim) : null;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.cor !== undefined) updateData.cor = data.cor;
    if (data.recorrencia !== undefined)
      updateData.recorrencia = data.recorrencia;
    if (data.diaSemana !== undefined) updateData.diaSemana = data.diaSemana;
    if (data.diaDoMes !== undefined) updateData.diaDoMes = data.diaDoMes;
    if (data.dataFimRecorrencia !== undefined) {
      updateData.dataFimRecorrencia = data.dataFimRecorrencia
        ? new Date(data.dataFimRecorrencia)
        : null;
    }
    if (data.imagemUrl !== undefined) {
      updateData.imagemUrl = data.imagemUrl;

      // Trocou ou removeu a capa: apaga a antiga no Cloudinary, senão ela fica
      // ocupando espaço para sempre sem aparecer em lugar nenhum.
      const eventoCompleto =
        await this.eventoRepository.buscarPorId(eventoId);
      const capaAntiga = eventoCompleto?.imagemUrl;
      if (capaAntiga && capaAntiga !== data.imagemUrl) {
        const publicId = extrairPublicId(capaAntiga);
        if (publicId) await removerImagem(publicId);
      }
    }
    if (data.destaqueHome !== undefined) {
      updateData.destaqueHome = data.destaqueHome;
      // Marcar este como destaque tira o destaque dos outros.
      if (data.destaqueHome) {
        await this.eventoRepository.limparDestaques(eventoId);
      }
    }

    const eventoAtualizado = await this.eventoRepository.atualizar(
      eventoId,
      updateData,
    );
    return this.formatarResponse(eventoAtualizado);
  }

  public async delete(
    eventoId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const eventoExistente =
      await this.eventoRepository.buscarParaPermissao(eventoId);
    if (!eventoExistente) throw new AppError("Evento não encontrado.", 404);

    const podeExcluir =
      eventoExistente.criadorId === usuarioId ||
      perfil === Perfis.ADMINISTRADOR ||
      perfil === Perfis.PASTOR;

    if (!podeExcluir) {
      throw new AppError(
        "Você não tem permissão para excluir este evento.",
        403,
      );
    }

    await this.eventoRepository.deletar(eventoId);
  }

  // gera as ocorrências do mês para eventos recorrentes
  private gerarOcorrencias(
    eventos: EventoComCriadorSimples[],
    mes: number,
    ano: number,
  ): EventoOcorrencia[] {
    const resultado: EventoOcorrencia[] = [];
    const diasNoMes = new Date(ano, mes, 0).getDate();

    for (const evento of eventos) {
      if (evento.recorrencia === "nenhuma") {
        resultado.push(this.toOcorrencia(evento, evento.dataInicio));
        continue;
      }

      if (evento.recorrencia === "semanal" && evento.diaSemana !== null) {
        for (let dia = 1; dia <= diasNoMes; dia++) {
          const data = comHorarioDoEvento(evento.dataInicio, ano, mes, dia);
          if (data.getDay() !== evento.diaSemana) continue;
          // `<` e não `<=`: a PRIMEIRA ocorrência é o próprio dia escolhido.
          // Comparar meia-noite com o horário real do evento excluía o dia
          // inicial de qualquer evento marcado depois das 00:00 — ou seja,
          // todos. Agora as duas pontas têm o mesmo horário.
          if (data < evento.dataInicio) continue;
          if (evento.dataFimRecorrencia && data > evento.dataFimRecorrencia)
            continue;
          resultado.push(this.toOcorrencia(evento, data));
        }
        continue;
      }

      if (evento.recorrencia === "mensal" && evento.diaDoMes !== null) {
        // `Math.min` para o dia 31 não virar dia 1 do mês seguinte em
        // fevereiro: um evento "todo dia 31" cai no último dia do mês curto.
        const diaValido = Math.min(evento.diaDoMes, diasNoMes);
        const data = comHorarioDoEvento(evento.dataInicio, ano, mes, diaValido);
        if (
          data >= evento.dataInicio &&
          (!evento.dataFimRecorrencia || data <= evento.dataFimRecorrencia)
        ) {
          resultado.push(this.toOcorrencia(evento, data));
        }
      }
    }

    return resultado;
  }

  private toOcorrencia(
    evento: EventoComCriadorSimples,
    dataInicio: Date,
  ): EventoOcorrencia {
    return {
      id: evento.id,
      titulo: evento.titulo,
      descricao: evento.descricao,
      tipo: evento.tipo,
      cor: evento.cor,
      dataInicio,
      dataFim: evento.dataFim,
      local: evento.local,
      recorrencia: evento.recorrencia,
      criadorId: evento.criadorId,
      destaqueHome: evento.destaqueHome,
      imagemUrl: evento.imagemUrl,
    };
  }

  private formatarResponse(evento: EventoComCriadorSimples): EventoResponse {
    return {
      id: evento.id,
      titulo: evento.titulo,
      descricao: evento.descricao,
      local: evento.local,
      dataInicio: evento.dataInicio,
      dataFim: evento.dataFim,
      tipo: evento.tipo,
      cor: evento.cor,
      recorrencia: evento.recorrencia,
      diaSemana: evento.diaSemana,
      diaDoMes: evento.diaDoMes,
      dataFimRecorrencia: evento.dataFimRecorrencia,
      destaqueHome: evento.destaqueHome,
      imagemUrl: evento.imagemUrl,
      criadorId: evento.criadorId,
      criador: {
        id: evento.criador?.id ?? 0,
        nomeCompleto: evento.criador?.nomeCompleto ?? "",
        perfil: evento.criador?.perfil ?? "",
      },
    };
  }
}
