// src/services/matricula.service.ts

import type {
    MatriculaResponse,
    ParticipanteSalaResponse,
    HistoricoCursoResponse,
    StatusMatricula
} from "../dtos/matricula.dto";
import { MatriculaRepository } from "../repository/matricula.repository";
import { UsuarioRepository } from "../repository/usuario.repository";
import { AppError } from "../utils/AppError";
import { Perfis } from "../constants/perfis";

export class MatriculaService {
    private matriculaRepository: MatriculaRepository;
    private usuarioRepository: UsuarioRepository;

    constructor(
        matriculaRepository?: MatriculaRepository,
        usuarioRepository?: UsuarioRepository
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
        acao: string = "realizar esta ação"
    ): void {
        const temPermissao =
            perfil === Perfis.ADMINISTRADOR ||
            perfil === Perfis.PASTOR ||
            (perfil === Perfis.LIDER && criadorUsuarioId === solicitanteId);

        if (!temPermissao) {
            throw new AppError(`Você não tem permissão para ${acao} nesta sala.`, 403);
        }
    }

    // ========================
    // MATRICULAR
    // ========================
    public async matricular(salaId: number, usuarioId: number): Promise<MatriculaResponse> {
        const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
        if (!usuario) throw new AppError("Usuário não encontrado", 404);

        const sala = await this.matriculaRepository.salaExiste(salaId);
        if (!sala) throw new AppError("Sala não encontrada", 404);
        if (sala.status !== "ativa") throw new AppError("Esta sala não está aberta para matrículas", 400);

        const matriculaExistente = await this.matriculaRepository.buscarMatricula(salaId, usuarioId);

        if (matriculaExistente?.status === "ativo") {
            throw new AppError("Você já está matriculado nesta sala", 409);
        }

        if (matriculaExistente?.status === "cancelado pelo usuario") {
            await this.matriculaRepository.atualizarStatus(salaId, usuarioId, "ativo");

            const matriculaReativada = await this.matriculaRepository.buscarMatricula(salaId, usuarioId);

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

        const matricula = await this.matriculaRepository.matricular(salaId, usuarioId);

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
    public async cancelarMatricula(salaId: number, usuarioId: number): Promise<void> {
        const matricula = await this.matriculaRepository.buscarMatricula(salaId, usuarioId);
        if (!matricula) throw new AppError("Matrícula não encontrada", 404);

        if (matricula.status !== "ativo") {
            throw new AppError("Esta matrícula não pode ser cancelada", 400);
        }

        await this.matriculaRepository.atualizarStatus(salaId, usuarioId, "cancelado pelo usuario");
    }

    // ========================
    // LISTAR PARTICIPANTES
    // ========================
    public async listarParticipantes(
        salaId: number,
    ): Promise<ParticipanteSalaResponse[]> {
        const sala = await this.matriculaRepository.salaExiste(salaId);
        if (!sala) throw new AppError("Sala não encontrada", 404);

        // Qualquer usuário logado pode ver (conforme sua decisão anterior)
        const participantes = await this.matriculaRepository.listarParticipantes(salaId);

        return participantes.map((p) => ({
            usuarioId: p.usuario.id,
            nomeCompleto: p.usuario.nomeCompleto,
            perfil: p.usuario.perfil,
            dataMatricula: p.dataMatricula,
            status: p.status as StatusMatricula,
        }));
    }

    // ========================
    // REMOVER PARTICIPANTE
    // ========================
    public async removerParticipante(
        salaId: number,
        usuarioIdParaRemover: number,
        solicitanteId: number,
        perfil: string
    ): Promise<void> {
        const sala = await this.matriculaRepository.salaExiste(salaId);
        if (!sala) throw new AppError("Sala não encontrada", 404);


        this.verificarPermissaoSala(perfil, sala.curso.criadorUsuarioId, solicitanteId, "remover participantes");

        await this.matriculaRepository.removerParticipante(salaId, usuarioIdParaRemover);
    }

    // ========================
    // ATUALIZAR STATUS
    // ========================
    public async atualizarStatusParticipante(
        salaId: number,
        usuarioId: number,
        novoStatus: "concluido" | "desistente",
        solicitanteId: number,
        perfil: string
    ): Promise<void> {
        const sala = await this.matriculaRepository.salaExiste(salaId);
        if (!sala) throw new AppError("Sala não encontrada", 404);


        this.verificarPermissaoSala(perfil, sala.curso.criadorUsuarioId, solicitanteId, "alterar o status");

        await this.matriculaRepository.atualizarStatus(salaId, usuarioId, novoStatus);
    }

    // ========================
    // HISTÓRICO
    // ========================
    public async buscarHistorico(usuarioId: number): Promise<HistoricoCursoResponse[]> {
        const historico = await this.matriculaRepository.buscarHistoricoPorUsuario(usuarioId);

        return historico.map((item) => ({
            cursoId: item.sala.curso.id,
            nomeCurso: item.sala.curso.nome,
            categoria: item.sala.curso.categoria,
            status: item.status,
            dataAdicao: item.dataMatricula,
            nomeSala: item.sala.nomeSala,
        }));
    }
}