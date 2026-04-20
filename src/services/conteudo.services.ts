// src/services/conteudo.service.ts
import type {
  CreateConteudoDTO,
  UpdateConteudoDTO,
  ConteudoResponse,
  ListarConteudosDTO,
} from "../dtos/conteudo.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { prisma } from "../lib/prisma";

export class ConteudoService {
  private usuarioRepository: UsuarioRepository;

  constructor() {
    this.usuarioRepository = new UsuarioRepository();
  }

  public async create(
    data: CreateConteudoDTO,
    usuarioId: number,
  ): Promise<ConteudoResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    const novoConteudo = await prisma.conteudo.create({
      data: {
        usuarioId,
        tipo: data.tipo,
        titulo: data.titulo,
        texto: data.texto || null,
        imagemUrl: data.imagemUrl || null,
        videoUrl: data.videoUrl || null,
        formato: data.formato,
        principal: data.principal || false,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    return {
      id: novoConteudo.id,
      tipo: novoConteudo.tipo,
      titulo: novoConteudo.titulo,
      texto: novoConteudo.texto || undefined,
      imagemUrl: novoConteudo.imagemUrl || undefined,
      videoUrl: novoConteudo.videoUrl || undefined,
      formato: novoConteudo.formato,
      dataPublicacao: novoConteudo.dataPublicacao,
      principal: novoConteudo.principal,
      autor: {
        id: novoConteudo.usuario.id,
        nomeCompleto: novoConteudo.usuario.nomeCompleto,
        perfil: novoConteudo.usuario.perfil,
      },
    };
  }

  public async list(
    filters: ListarConteudosDTO = {},
  ): Promise<ConteudoResponse[]> {
    const { tipo, limit = 20, busca, orderBy = "recent", page = 1 } = filters;

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (tipo) whereClause.tipo = tipo;
    if (busca) {
      whereClause.titulo = {
        contains: busca,
        mode: "insensitive",
      };
    }

    const conteudos = await prisma.conteudo.findMany({
      ...(Object.keys(whereClause).length > 0 ? { where: whereClause } : {}),
      orderBy: {
        dataPublicacao: orderBy === "recent" ? "desc" : "asc",
      },
      take: limit,
      skip,
      include: {
        usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    return conteudos.map((conteudo) => ({
      id: conteudo.id,
      tipo: conteudo.tipo,
      titulo: conteudo.titulo,
      texto: conteudo.texto || undefined,
      imagemUrl: conteudo.imagemUrl || undefined,
      videoUrl: conteudo.videoUrl || undefined,
      formato: conteudo.formato,
      dataPublicacao: conteudo.dataPublicacao,
      principal: conteudo.principal,
      autor: {
        id: conteudo.usuario.id,
        nomeCompleto: conteudo.usuario.nomeCompleto,
        perfil: conteudo.usuario.perfil,
      },
    }));
  }

  public async update(
    conteudoId: number,
    data: UpdateConteudoDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<ConteudoResponse> {
    const conteudoExistente = await prisma.conteudo.findUnique({
      where: { id: conteudoId },
      include: {
        usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    if (!conteudoExistente) {
      throw new Error("Conteúdo não encontrado.");
    }

    if (
      perfil !== "Administrador" &&
      conteudoExistente.usuarioId !== usuarioId
    ) {
      throw new Error("Você não tem permissão para atualizar este conteúdo.");
    }

    const updateData: {
      tipo?: string;
      titulo?: string;
      texto?: string | null;
      imagemUrl?: string | null;
      videoUrl?: string | null;
      formato?: string;
      principal?: boolean;
      dataValidade?: Date | null;
    } = {};

    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.titulo !== undefined) updateData.titulo = data.titulo;
    if (data.texto !== undefined) updateData.texto = data.texto;
    if (data.imagemUrl !== undefined) updateData.imagemUrl = data.imagemUrl;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
    if (data.formato !== undefined) updateData.formato = data.formato;
    if (data.principal !== undefined) updateData.principal = data.principal;
    if (data.dataValidade !== undefined) {
      updateData.dataValidade = data.dataValidade
        ? new Date(data.dataValidade)
        : null;
    }

    const conteudoAtualizado = await prisma.conteudo.update({
      where: { id: conteudoId },
      data: updateData,
      include: {
        usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            perfil: true,
          },
        },
      },
    });

    return {
      id: conteudoAtualizado.id,
      tipo: conteudoAtualizado.tipo,
      titulo: conteudoAtualizado.titulo,
      texto: conteudoAtualizado.texto || undefined,
      imagemUrl: conteudoAtualizado.imagemUrl || undefined,
      videoUrl: conteudoAtualizado.videoUrl || undefined,
      formato: conteudoAtualizado.formato,
      dataPublicacao: conteudoAtualizado.dataPublicacao,
      principal: conteudoAtualizado.principal,
      autor: {
        id: conteudoAtualizado.usuario.id,
        nomeCompleto: conteudoAtualizado.usuario.nomeCompleto,
        perfil: conteudoAtualizado.usuario.perfil,
      },
    };
  }

  public async delete(
    conteudoId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const conteudoExistente = await prisma.conteudo.findUnique({
      where: { id: conteudoId },
      select: {
        id: true,
        usuarioId: true,
      },
    });

    if (!conteudoExistente) {
      throw new Error("Conteúdo não encontrado.");
    }

    if (
      perfil !== "Administrador" &&
      conteudoExistente.usuarioId !== usuarioId
    ) {
      throw new Error("Você não tem permissão para excluir este conteúdo.");
    }

    await prisma.conteudo.delete({
      where: { id: conteudoId },
    });
  }
}
