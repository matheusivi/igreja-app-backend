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
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";
import { Perfis } from "../constants/perfis";

export class SalaService {
  private usuarioRepository: UsuarioRepository;
  private salaCursoRepository: SalaCursoRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    salaCursoRepository?: SalaCursoRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.salaCursoRepository = salaCursoRepository ?? new SalaCursoRepository();
  }

  public async create(
    data: CreateSalaDTO,
    usuarioId: number,
  ): Promise<SalaResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado", 404);

    const cursoExiste = await this.salaCursoRepository.cursoExiste(
      data.cursoId,
    );
    if (!cursoExiste) throw new AppError("Curso não encontrado", 404);

    const novaSala = await this.salaCursoRepository.criar({
      curso: { connect: { id: data.cursoId } },
      nomeSala: data.nomeSala,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
      dataFim: data.dataFim ? new Date(data.dataFim) : null,
      status: "ativa",
    });

    return this.formatarResponse(novaSala);
  }

  public async getById(salaId: number): Promise<SalaResponse> {
    const sala = await this.salaCursoRepository.buscarPorId(salaId);
    if (!sala) throw new AppError("Sala não encontrada", 404);

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

    whereClauses.push({ status: "ativa" });

    const categoriasPermitidas: string[] = ["Casais", "Jovens", "Geral"];
    if (sexoUsuario === "Masculino") categoriasPermitidas.push("Homens");
    if (sexoUsuario === "Feminino") categoriasPermitidas.push("Mulheres");

    whereClauses.push({
      curso: { is: { categoria: { in: categoriasPermitidas } } },
    });

    if (cursoId !== undefined) whereClauses.push({ cursoId });
    if (busca) {
      whereClauses.push({ nomeSala: { contains: busca, mode: "insensitive" } });
    }

    const cursoFilter: Prisma.CursoWhereInput = {};
    if (cursoNome)
      cursoFilter.nome = { contains: cursoNome, mode: "insensitive" };
    if (liderNome) {
      cursoFilter.criador = {
        is: { nomeCompleto: { contains: liderNome, mode: "insensitive" } },
      };
    }

    if (Object.keys(cursoFilter).length > 0) {
      whereClauses.push({ curso: { is: cursoFilter } });
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

    if (
      perfil !== Perfis.ADMINISTRADOR &&
      perfil !== Perfis.PASTOR &&
      salaExistente.curso.criadorUsuarioId !== usuarioId
    ) {
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

    if (
      perfil !== Perfis.ADMINISTRADOR &&
      perfil !== Perfis.PASTOR &&
      salaExistente.curso.criadorUsuarioId !== usuarioId
    ) {
      throw new AppError(
        "Você não tem permissão para atualizar esta sala",
        403,
      );
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
      curso: {
        id: sala.curso?.id ?? 0,
        nome: sala.curso?.nome ?? "",
      },
    };
  }
}
