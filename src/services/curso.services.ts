// src/services/curso.service.ts
import type {
  CreateCursoDTO,
  UpdateCursoDTO,
  CursoResponse,
  ListCursosQuery,
} from "../dtos/curso.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { prisma } from "../lib/prisma";

export class CursoService {
  private usuarioRepository: UsuarioRepository;

  constructor() {
    this.usuarioRepository = new UsuarioRepository();
  }

  public async create(
    data: CreateCursoDTO,
    usuarioId: number,
  ): Promise<CursoResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    const novoCurso = await prisma.curso.create({
      data: {
        criadorUsuarioId: usuarioId,
        nome: data.nome,
        descricaoMaterial: data.descricaoMaterial || null,
        categoria: data.categoria,
      },
      include: {
        criador: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    return {
      id: novoCurso.id,
      nome: novoCurso.nome,
      descricaoMaterial: novoCurso.descricaoMaterial || undefined,
      categoria: novoCurso.categoria,
      criador: {
        id: novoCurso.criador.id,
        nomeCompleto: novoCurso.criador.nomeCompleto,
        perfil: novoCurso.criador.perfil,
      },
    };
  }

  public async list(filters: ListCursosQuery = {}): Promise<CursoResponse[]> {
    const {
      categoria,
      busca,
      limit = 20,
      page = 1,
      orderBy = "recent",
    } = filters;

    const skip = (page - 1) * limit;

    const cursos = await prisma.curso.findMany({
      where: {
        ...(categoria && { categoria }),
        ...(busca && {
          nome: {
            contains: busca,
            mode: "insensitive",
          },
        }),
      },
      orderBy: {
        id: orderBy === "oldest" ? "asc" : "desc",
      },
      take: limit,
      skip: skip,
      include: {
        criador: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    return cursos.map((curso) => ({
      id: curso.id,
      nome: curso.nome,
      descricaoMaterial: curso.descricaoMaterial || undefined,
      categoria: curso.categoria,
      criador: {
        id: curso.criador.id,
        nomeCompleto: curso.criador.nomeCompleto,
        perfil: curso.criador.perfil,
      },
    }));
  }

  public async update(
    cursoId: number,
    data: UpdateCursoDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<CursoResponse> {
    const cursoExistente = await prisma.curso.findUnique({
      where: { id: cursoId },
      include: {
        criador: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    if (!cursoExistente) {
      throw new Error("Curso não encontrado.");
    }

    if (
      perfil !== "Administrador" &&
      cursoExistente.criadorUsuarioId !== usuarioId
    ) {
      throw new Error("Você não tem permissão para atualizar este curso.");
    }

    const updateData: {
      nome?: string;
      descricaoMaterial?: string | null;
      categoria?: string;
    } = {};

    if (data.nome !== undefined) {
      updateData.nome = data.nome;
    }

    if (data.descricaoMaterial !== undefined) {
      updateData.descricaoMaterial = data.descricaoMaterial;
    }

    if (data.categoria !== undefined) {
      updateData.categoria = data.categoria;
    }

    const cursoAtualizado = await prisma.curso.update({
      where: { id: cursoId },
      data: updateData,
      include: {
        criador: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    return {
      id: cursoAtualizado.id,
      nome: cursoAtualizado.nome,
      descricaoMaterial: cursoAtualizado.descricaoMaterial || undefined,
      categoria: cursoAtualizado.categoria,
      criador: {
        id: cursoAtualizado.criador.id,
        nomeCompleto: cursoAtualizado.criador.nomeCompleto,
        perfil: cursoAtualizado.criador.perfil,
      },
    };
  }

  public async delete(
    cursoId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const cursoExistente = await prisma.curso.findUnique({
      where: { id: cursoId },
      select: {
        id: true,
        criadorUsuarioId: true,
      },
    });

    if (!cursoExistente) {
      throw new Error("Curso não encontrado.");
    }

    if (
      perfil !== "Administrador" &&
      cursoExistente.criadorUsuarioId !== usuarioId
    ) {
      throw new Error("Você não tem permissão para excluir este curso.");
    }

    await prisma.curso.delete({
      where: { id: cursoId },
    });
  }
}
