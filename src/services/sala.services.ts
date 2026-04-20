// src/services/sala.service.ts
import type {
  CreateSalaDTO,
  ListSalasQuery,
  SalaResponse,
  UpdateSalaDTO,
} from "../dtos/curso.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { prisma } from "../lib/prisma";

export class SalaService {
  private usuarioRepository: UsuarioRepository;

  constructor() {
    this.usuarioRepository = new UsuarioRepository();
  }

  public async create(
    data: CreateSalaDTO,
    usuarioId: number,
  ): Promise<SalaResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    const cursoExiste = await prisma.curso.findUnique({
      where: { id: data.cursoId },
    });

    if (!cursoExiste) {
      throw new Error("Curso não encontrado.");
    }

    const novaSala = await prisma.salaCurso.create({
      data: {
        cursoId: data.cursoId,
        nomeSala: data.nomeSala,
        dataInicio: data.dataInicio ? new Date(data.dataInicio) : null,
        dataFim: data.dataFim ? new Date(data.dataFim) : null,
        status: "ativa",
      },
      include: {
        curso: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return {
      id: novaSala.id,
      nomeSala: novaSala.nomeSala,
      dataInicio: novaSala.dataInicio,
      dataFim: novaSala.dataFim,
      status: novaSala.status,
      curso: {
        id: novaSala.curso.id,
        nome: novaSala.curso.nome,
      },
    };
  }

  public async list(filters: ListSalasQuery = {}): Promise<
    Array<
      SalaResponse & {
        curso: SalaResponse["curso"] & {
          criador: {
            id: number;
            nomeCompleto: string;
            perfil: string;
          };
        };
      }
    >
  > {
    const {
      cursoId,
      status,
      limit = 20,
      page = 1,
      busca,
      cursoNome,
      liderNome,
    } = filters;

    const skip = (page - 1) * limit;

    const whereClauses: any[] = [];

    if (cursoId !== undefined) {
      whereClauses.push({ cursoId });
    }

    if (status) {
      whereClauses.push({ status });
    }

    if (busca) {
      whereClauses.push({
        nomeSala: {
          contains: busca,
          mode: "insensitive",
        },
      });
    }

    const cursoFilter: any = {};

    if (cursoNome) {
      cursoFilter.nome = {
        contains: cursoNome,
        mode: "insensitive",
      };
    }

    if (liderNome) {
      cursoFilter.criador = {
        is: {
          nomeCompleto: {
            contains: liderNome,
            mode: "insensitive",
          },
        },
      };
    }

    if (Object.keys(cursoFilter).length > 0) {
      whereClauses.push({
        curso: {
          is: cursoFilter,
        },
      });
    }

    const salas = await prisma.salaCurso.findMany({
      ...(whereClauses.length > 0 ? { where: { AND: whereClauses } } : {}),
      orderBy: {
        id: "desc",
      },
      take: limit,
      skip,
      include: {
        curso: {
          include: {
            criador: {
              select: {
                id: true,
                nomeCompleto: true,
                perfil: true,
              },
            },
          },
        },
      },
    });

    return salas.map((sala) => ({
      id: sala.id,
      nomeSala: sala.nomeSala,
      dataInicio: sala.dataInicio,
      dataFim: sala.dataFim,
      status: sala.status,
      curso: {
        id: sala.curso.id,
        nome: sala.curso.nome,
        criador: {
          id: sala.curso.criador.id,
          nomeCompleto: sala.curso.criador.nomeCompleto,
          perfil: sala.curso.criador.perfil,
        },
      },
    }));
  }

  public async update(
    salaId: number,
    data: UpdateSalaDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<SalaResponse> {
    const salaExistente = await prisma.salaCurso.findUnique({
      where: { id: salaId },
      include: {
        curso: {
          select: {
            criadorUsuarioId: true,
          },
        },
      },
    });

    if (!salaExistente) {
      throw new Error("Sala não encontrada.");
    }

    if (
      perfil !== "Administrador" &&
      perfil !== "Pastor" &&
      salaExistente.curso.criadorUsuarioId !== usuarioId
    ) {
      throw new Error("Você não tem permissão para atualizar esta sala.");
    }

    const updateData: {
      nomeSala?: string;
      dataInicio?: Date | null;
      dataFim?: Date | null;
      status?: string;
    } = {};

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

    const salaAtualizada = await prisma.salaCurso.update({
      where: { id: salaId },
      data: updateData,
      include: {
        curso: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return {
      id: salaAtualizada.id,
      nomeSala: salaAtualizada.nomeSala,
      dataInicio: salaAtualizada.dataInicio,
      dataFim: salaAtualizada.dataFim,
      status: salaAtualizada.status,
      curso: {
        id: salaAtualizada.curso.id,
        nome: salaAtualizada.curso.nome,
      },
    };
  }

  public async delete(
    salaId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const salaExistente = await prisma.salaCurso.findUnique({
      where: { id: salaId },
      include: {
        curso: {
          select: {
            criadorUsuarioId: true,
          },
        },
      },
    });

    if (!salaExistente) {
      throw new Error("Sala não encontrada.");
    }

    if (
      perfil !== "Administrador" &&
      perfil !== "Pastor" &&
      salaExistente.curso.criadorUsuarioId !== usuarioId
    ) {
      throw new Error("Você não tem permissão para excluir esta sala.");
    }

    await prisma.salaCurso.delete({
      where: { id: salaId },
    });
  }
}
