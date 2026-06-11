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
      const dia = ocorrencia.dataInicio.getDate();
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
          const data = new Date(ano, mes - 1, dia);
          if (data.getDay() !== evento.diaSemana) continue;
          if (data < evento.dataInicio) continue;
          if (evento.dataFimRecorrencia && data > evento.dataFimRecorrencia)
            continue;
          resultado.push(this.toOcorrencia(evento, data));
        }
        continue;
      }

      if (evento.recorrencia === "mensal" && evento.diaDoMes !== null) {
        const data = new Date(ano, mes - 1, evento.diaDoMes);
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
      tipo: evento.tipo,
      cor: evento.cor,
      dataInicio,
      dataFim: evento.dataFim,
      local: evento.local,
      recorrencia: evento.recorrencia,
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
      criador: {
        id: evento.criador?.id ?? 0,
        nomeCompleto: evento.criador?.nomeCompleto ?? "",
        perfil: evento.criador?.perfil ?? "",
      },
    };
  }
}
