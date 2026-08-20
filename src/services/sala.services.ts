// src/services/sala.service.ts
import type {
  CreateSalaDTO,
  ListSalasQuery,
  SalaResponse,
  UpdateSalaDTO,
  SalaComCursoSimples,
  ListarSalasResponse,
} from "../dtos/sala.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { SalaCursoRepository } from "../repository/salaCurso.repository";
import { MatriculaRepository } from "../repository/matricula.repository";
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";
import { Perfis } from "../constants/perfis";

/** "Masculino" → "Homens". Usado para casar pessoa e público da turma. */
function publicoDoSexo(sexo: string): "Homens" | "Mulheres" | null {
  if (sexo === "Masculino") return "Homens";
  if (sexo === "Feminino") return "Mulheres";
  return null;
}

/**
 * Público padrão de uma turma nova, deduzido da categoria do curso.
 *
 * Curso "Homens" não deveria exigir que o líder marque a turma como
 * masculina toda vez — isso já está dito na categoria. Em curso Geral o
 * padrão é aberto, e o líder decide se quer separar.
 */
function publicoPadrao(categoria: string): "Todos" | "Homens" | "Mulheres" {
  if (categoria === "Homens") return "Homens";
  if (categoria === "Mulheres") return "Mulheres";
  return "Todos";
}

/**
 * Quem pode mexer nesta turma.
 *
 * ═══ O QUE FALTAVA ═══
 * A regra olhava só para o criador do CURSO. Mas quem cria uma turma vira o
 * LÍDER dela — o `create` faz `lider: { connect: { id: usuarioId } }`, a tela
 * de criação promete "você será o líder desta turma", e o banco guarda isso em
 * `liderUsuarioId`.
 *
 * Esse campo era simplesmente ignorado na hora de editar e de excluir. O
 * resultado: um líder criava a turma dentro de um curso do pastor, virava
 * responsável por ela — e não conseguia nem corrigir o nome nem apagá-la.
 * Criava e ficava preso.
 *
 * ═══ POR QUE O CRIADOR DO CURSO CONTINUA PODENDO ═══
 * O curso é a trilha; as turmas são as ofertas dela. Quem montou a trilha
 * responde pelo conjunto, inclusive por turma que alguém abriu e abandonou.
 *
 * ═══ ISTO NÃO AFROUXA NADA ═══
 * A rota já exige Administrador, Pastor ou Líder (`requireRole`). O que muda é
 * QUAL líder — antes, nenhum que não fosse dono do curso; agora, o que conduz
 * aquela turma. As travas seguintes (turma com matrículas só o administrador
 * exclui) continuam valendo.
 */
function podeGerenciarTurma(
  sala: { liderUsuarioId: number | null; curso: { criadorUsuarioId: number } },
  usuarioId: number,
  perfil: string,
): boolean {
  return (
    perfil === Perfis.ADMINISTRADOR ||
    perfil === Perfis.PASTOR ||
    sala.curso.criadorUsuarioId === usuarioId ||
    sala.liderUsuarioId === usuarioId
  );
}

export class SalaService {
  private usuarioRepository: UsuarioRepository;
  private salaCursoRepository: SalaCursoRepository;
  private matriculaRepository: MatriculaRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    salaCursoRepository?: SalaCursoRepository,
    matriculaRepository?: MatriculaRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.salaCursoRepository = salaCursoRepository ?? new SalaCursoRepository();
    this.matriculaRepository = matriculaRepository ?? new MatriculaRepository();
  }

  public async create(
    data: CreateSalaDTO,
    usuarioId: number,
  ): Promise<SalaResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado", 404);

    const curso = await this.salaCursoRepository.cursoExiste(data.cursoId);
    if (!curso) throw new AppError("Curso não encontrado", 404);

    const novaSala = await this.salaCursoRepository.criar({
      curso: { connect: { id: data.cursoId } },
      nomeSala: data.nomeSala,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
      dataFim: data.dataFim ? new Date(data.dataFim) : null,
      status: "ativa",
      capacidade: data.capacidade ?? null,
      publico: data.publico ?? publicoPadrao(curso.categoria),
      // Quem cria a turma passa a ser o líder dela — era o que a tela de
      // criação já prometia ao usuário, mas ninguém guardava.
      lider: { connect: { id: usuarioId } },
    });

    return this.formatarResponse(novaSala);
  }

  public async getById(
    salaId: number,
    sexoUsuario: string,
  ): Promise<SalaResponse> {
    const sala = await this.salaCursoRepository.buscarPorIdComCategoria(salaId);
    if (!sala) throw new AppError("Sala não encontrada", 404);


    const categoria = sala.curso?.categoria ?? "";
    const categoriasPermitidas: string[] = ["Casais", "Jovens", "Geral", "Batismo"];
    if (sexoUsuario === "Masculino") categoriasPermitidas.push("Homens");
    if (sexoUsuario === "Feminino") categoriasPermitidas.push("Mulheres");

    if (!categoriasPermitidas.includes(categoria)) {
      throw new AppError("Você não tem acesso a esta sala.", 403);
    }

    return this.formatarResponse(sala);
  }

  public async list(
    filters: ListSalasQuery = {},
    sexoUsuario: string,
  ): Promise<ListarSalasResponse> {
    const {
      cursoId,
      limit = 20,
      page = 1,
      busca,
      cursoNome,
      liderNome,
    } = filters;

    const skip = (page - 1) * limit;
    const whereClauses: Prisma.SalaCursoWhereInput[] = [];

    // Antes isto era `{ status: "ativa" }` fixo: turma encerrada desaparecia
    // do app para todo mundo, inclusive para quem participou dela e para o
    // próprio líder. Agora o filtro é opcional e quem decide é a tela.
    if (filters.status) {
      whereClauses.push({ status: filters.status });
    }

    const categoriasPermitidas: string[] = ["Casais", "Jovens", "Geral", "Batismo"];
    if (sexoUsuario === "Masculino") categoriasPermitidas.push("Homens");
    if (sexoUsuario === "Feminino") categoriasPermitidas.push("Mulheres");

    whereClauses.push({
      curso: { is: { categoria: { in: categoriasPermitidas } } },
    });

    // Turma restrita por sexo. Complementa o filtro por categoria: um curso
    // Geral pode ter uma turma só de homens e outra só de mulheres.
    const publicoDaPessoa = publicoDoSexo(sexoUsuario);
    whereClauses.push({
      OR: [
        { publico: "Todos" },
        ...(publicoDaPessoa ? [{ publico: publicoDaPessoa }] : []),
      ],
    });

    if (cursoId !== undefined) whereClauses.push({ cursoId });
    if (busca) {
      whereClauses.push({ nomeSala: { contains: busca, mode: "insensitive" } });
    }

    const cursoFilter: Prisma.CursoWhereInput = {};
    if (cursoNome)
      cursoFilter.nome = { contains: cursoNome, mode: "insensitive" };

    if (Object.keys(cursoFilter).length > 0) {
      whereClauses.push({ curso: { is: cursoFilter } });
    }

    // Busca pelo líder DA TURMA, não pelo criador do curso. Antes olhava
    // `curso.criador`, o que devolvia todas as turmas do curso independente
    // de quem realmente conduz cada uma.
    if (liderNome) {
      whereClauses.push({
        lider: {
          is: { nomeCompleto: { contains: liderNome, mode: "insensitive" } },
        },
      });
    }

    const whereClause = { AND: whereClauses };

    const [salas, total] = await Promise.all([
      this.salaCursoRepository.listar({
        where: whereClause,
        orderBy: { id: "desc" },
        take: limit,
        skip,
      }),
      this.salaCursoRepository.contar(whereClause),
    ]);

    return {
      data: salas.map((sala) => this.formatarResponse(sala)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
  public async update(
    salaId: number,
    data: UpdateSalaDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<SalaResponse> {
    const salaExistente =
      await this.salaCursoRepository.buscarParaPermissao(salaId);
    if (!salaExistente) throw new AppError("Sala não encontrada", 404);

    if (!podeGerenciarTurma(salaExistente, usuarioId, perfil)) {
      throw new AppError(
        "Você não tem permissão para atualizar esta sala",
        403,
      );
    }

    const updateData: Prisma.SalaCursoUpdateInput = {};

    if (data.nomeSala !== undefined) updateData.nomeSala = data.nomeSala;
    if (data.dataInicio !== undefined) {
      updateData.dataInicio = data.dataInicio
        ? new Date(data.dataInicio)
        : null;
    }
    if (data.dataFim !== undefined) {
      updateData.dataFim = data.dataFim ? new Date(data.dataFim) : null;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.capacidade !== undefined) updateData.capacidade = data.capacidade;
    if (data.publico !== undefined) updateData.publico = data.publico;

    // Encerrar a turma fecha as matrículas que ainda estavam ativas. Sem
    // isso elas ficariam "ativo" para sempre e o Perfil da pessoa continuaria
    // mostrando "Em andamento" num curso que já acabou.
    if (data.status === "concluída") {
      const salaComCategoria =
        await this.salaCursoRepository.buscarPorIdComCategoria(salaId);

      const ativos =
        await this.matriculaRepository.listarUsuariosAtivos(salaId);
      await this.matriculaRepository.concluirMatriculasAtivas(salaId);

      // Concluir Batismo é o que marca a pessoa como batizada no perfil.
      if (salaComCategoria?.curso?.categoria === "Batismo") {
        await this.usuarioRepository.marcarBatizadosEmLote(ativos);
      }
    }

    const salaAtualizada = await this.salaCursoRepository.atualizar(
      salaId,
      updateData,
    );

    return this.formatarResponse(salaAtualizada);
  }

  public async delete(
    salaId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const salaExistente =
      await this.salaCursoRepository.buscarParaPermissao(salaId);
    if (!salaExistente) throw new AppError("Sala não encontrada", 404);

    if (!podeGerenciarTurma(salaExistente, usuarioId, perfil)) {
      throw new AppError("Você não tem permissão para excluir esta turma", 403);
    }

    // Mesma regra do curso: apagar a turma leva junto as matrículas. Quem tem
    // gente matriculada deve ser encerrada, não excluída — encerrar preserva
    // o histórico de quem participou.
    if (perfil !== Perfis.ADMINISTRADOR) {
      const matriculas =
        await this.matriculaRepository.contarParticipantes(salaId);
      if (matriculas > 0) {
        throw new AppError(
          `Esta turma tem ${matriculas} matrícula(s) registradas. Use "Encerrar turma" para finalizá-la sem perder o histórico — excluir é permitido apenas ao administrador.`,
          403,
        );
      }
    }

    await this.salaCursoRepository.deletar(salaId);
  }

  private formatarResponse(sala: SalaComCursoSimples): SalaResponse {
    return {
      id: sala.id,
      nomeSala: sala.nomeSala,
      dataInicio: sala.dataInicio,
      dataFim: sala.dataFim,
      status: sala.status,
      capacidade: sala.capacidade,
      publico: sala.publico,
      totalMatriculas: sala._count?.participantes ?? 0,
      lider: sala.lider ?? null,
      cursoId: sala.cursoId,
      curso: {
        id: sala.curso?.id ?? 0,
        nome: sala.curso?.nome ?? "",
      },
    };
  }
}
