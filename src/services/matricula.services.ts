// src/services/matricula.service.ts

import type {
  MatriculaResponse,
  ParticipanteSalaResponse,
  HistoricoCursoResponse,
  StatusMatricula,
  ListarParticipantesResponse,
  ListarHistoricoResponse,
} from "../dtos/matricula.dto";
import { MatriculaRepository } from "../repository/matricula.repository";
import { UsuarioRepository } from "../repository/usuario.repository";
import { AppError } from "../utils/AppError";
import { Perfis } from "../constants/perfis";
import {
  MatriculaStatus,
  MatriculaStatusType,
} from "../constants/matriculaStatus";

export class MatriculaService {
  private matriculaRepository: MatriculaRepository;
  private usuarioRepository: UsuarioRepository;

  constructor(
    matriculaRepository?: MatriculaRepository,
    usuarioRepository?: UsuarioRepository,
  ) {
    this.matriculaRepository = matriculaRepository ?? new MatriculaRepository();
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
  }

  /**
   * Função auxiliar para verificar permissão em uma sala
   * Regra: Administrador ou Pastor → sempre pode
   *        Líder → só se for o criador do curso da sala
   */
  private verificarPermissaoSala(
    perfil: string,
    criadorUsuarioId: number,
    solicitanteId: number,
    acao: string = "realizar esta ação",
  ): void {
    const temPermissao =
      perfil === Perfis.ADMINISTRADOR ||
      perfil === Perfis.PASTOR ||
      (perfil === Perfis.LIDER && criadorUsuarioId === solicitanteId);

    if (!temPermissao) {
      throw new AppError(
        `Você não tem permissão para ${acao} nesta sala.`,
        403,
      );
    }
  }

  // ========================
  // MATRICULAR
  // ========================
  public async matricular(
    salaId: number,
    usuarioId: number,
  ): Promise<MatriculaResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado", 404);

    const sala = await this.matriculaRepository.salaExiste(salaId);
    if (!sala) throw new AppError("Sala não encontrada", 404);
    if (sala.status !== "ativa")
      throw new AppError("Esta sala não está aberta para matrículas", 400);

    if (sala.curso.categoria === "Batismo") {
      const jaPossuiBatismoAtivo =
        await this.matriculaRepository.buscarMatriculaBatismoAtiva(usuarioId);
      if (jaPossuiBatismoAtivo) {
        throw new AppError(
          "Você já está inscrito em uma turma de batismo ativa.",
          409,
        );
      }
    }

    const matriculaExistente = await this.matriculaRepository.buscarMatricula(
      salaId,
      usuarioId,
    );

    if (matriculaExistente) {
      if (matriculaExistente.status === MatriculaStatus.ATIVO) {
        throw new AppError("Você já está matriculado nesta sala", 409);
      }

      if (matriculaExistente.status === MatriculaStatus.CONCLUIDO) {
        throw new AppError(
          "Você já concluiu esta sala e não pode se rematricular",
          409,
        );
      }

      // "cancelado_pelo_usuario" ou "desistente" → reativa
      await this.matriculaRepository.atualizarStatus(
        salaId,
        usuarioId,
        MatriculaStatus.ATIVO,
      );

      const matriculaReativada = await this.matriculaRepository.buscarMatricula(
        salaId,
        usuarioId,
      );
      if (!matriculaReativada || !matriculaReativada.sala) {
        throw new AppError("Erro ao reativar matrícula", 500);
      }

      return {
        salaId: matriculaReativada.salaId,
        usuarioId: matriculaReativada.usuarioId,
        nomeSala: matriculaReativada.sala.nomeSala,
        nomeCurso: matriculaReativada.sala.curso.nome,
        dataMatricula: matriculaReativada.dataMatricula,
        status: matriculaReativada.status,
      };
    }

    const matricula = await this.matriculaRepository.matricular(
      salaId,
      usuarioId,
    );

    return {
      salaId: matricula.salaId,
      usuarioId: matricula.usuarioId,
      nomeSala: matricula.sala.nomeSala,
      nomeCurso: matricula.sala.curso.nome,
      dataMatricula: matricula.dataMatricula,
      status: matricula.status,
    };
  }

  // ========================
  // CANCELAR MATRÍCULA
  // ========================
  public async cancelarMatricula(
    salaId: number,
    usuarioId: number,
  ): Promise<void> {
    const matricula = await this.matriculaRepository.buscarMatricula(
      salaId,
      usuarioId,
    );
    if (!matricula) throw new AppError("Matrícula não encontrada", 404);

    if (matricula.status !== MatriculaStatus.ATIVO) {
      throw new AppError("Esta matrícula não pode ser cancelada", 400);
    }

    await this.matriculaRepository.atualizarStatus(
      salaId,
      usuarioId,
      MatriculaStatus.CANCELADO_PELO_USUARIO,
    );
  }

  // ========================
  // LISTAR PARTICIPANTES
  // ========================
  public async listarParticipantes(
    salaId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<ListarParticipantesResponse> {
    const sala = await this.matriculaRepository.salaExiste(salaId);
    if (!sala) throw new AppError("Sala não encontrada", 404);

    const skip = (page - 1) * limit;

    const [participantes, total] = await Promise.all([
      this.matriculaRepository.listarParticipantes(salaId, skip, limit),
      this.matriculaRepository.contarParticipantes(salaId),
    ]);

    return {
      data: participantes.map((p) => ({
        usuarioId: p.usuario.id,
        nomeCompleto: p.usuario.nomeCompleto,
        perfil: p.usuario.perfil,
        dataMatricula: p.dataMatricula,
        status: p.status as StatusMatricula,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================
  // REMOVER PARTICIPANTE
  // ========================
  public async removerParticipante(
    salaId: number,
    usuarioIdParaRemover: number,
    solicitanteId: number,
    perfil: string,
  ): Promise<void> {
    const sala = await this.matriculaRepository.salaExiste(salaId);
    if (!sala) throw new AppError("Sala não encontrada", 404);

    this.verificarPermissaoSala(
      perfil,
      sala.curso.criadorUsuarioId,
      solicitanteId,
      "remover participantes",
    );

    await this.matriculaRepository.removerParticipante(
      salaId,
      usuarioIdParaRemover,
    );
  }

  // ========================
  // ATUALIZAR STATUS
  // ========================
  public async atualizarStatusParticipante(
    salaId: number,
    usuarioId: number,
    novoStatus: Extract<MatriculaStatusType, "concluido" | "desistente">,
    solicitanteId: number,
    perfil: string,
  ): Promise<void> {
    const sala = await this.matriculaRepository.salaExiste(salaId);
    if (!sala) throw new AppError("Sala não encontrada", 404);

    this.verificarPermissaoSala(
      perfil,
      sala.curso.criadorUsuarioId,
      solicitanteId,
      "alterar o status",
    );

    await this.matriculaRepository.atualizarStatus(
      salaId,
      usuarioId,
      novoStatus,
    );

    if (
      novoStatus === MatriculaStatus.CONCLUIDO &&
      sala.curso.categoria === "Batismo"
    ) {
      await this.usuarioRepository.marcarBatizado(usuarioId);
    }
  }

  // ========================
  // HISTÓRICO
  // ========================
  public async buscarHistorico(
    usuarioId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<ListarHistoricoResponse> {
    const skip = (page - 1) * limit;

    const [historico, total] = await Promise.all([
      this.matriculaRepository.buscarHistoricoPorUsuario(
        usuarioId,
        skip,
        limit,
      ),
      this.matriculaRepository.contarHistoricoPorUsuario(usuarioId),
    ]);

    return {
      data: historico.map((item) => ({
        cursoId: item.sala.curso.id,
        nomeCurso: item.sala.curso.nome,
        categoria: item.sala.curso.categoria,
        status: item.status,
        dataAdicao: item.dataMatricula,
        nomeSala: item.sala.nomeSala,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
