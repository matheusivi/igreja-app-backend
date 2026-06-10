// src/services/conteudo.service.ts
import type {
  CreateConteudoDTO,
  UpdateConteudoDTO,
  ConteudoResponse,
  ListarConteudosDTO,
  ConteudoComUsuarioSimples,
  ListarConteudosResponse,
} from "../dtos/conteudo.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { ConteudoRepository } from "../repository/conteudo.repository";
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";
import { Perfis } from "../constants/perfis";

export class ConteudoService {
  private usuarioRepository: UsuarioRepository;
  private conteudoRepository: ConteudoRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    conteudoRepository?: ConteudoRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.conteudoRepository = conteudoRepository ?? new ConteudoRepository();
  }

  public async create(
    data: CreateConteudoDTO,
    usuarioId: number,
  ): Promise<ConteudoResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const novoConteudo = await this.conteudoRepository.criar({
      usuario: { connect: { id: usuarioId } },
      tipo: data.tipo,
      titulo: data.titulo,
      texto: data.texto || null,
      imagemUrl: data.imagemUrl || null,
      videoUrl: data.videoUrl || null,
      formato: data.formato,
      principal: data.principal || false,
      dataValidade: data.dataValidade ? new Date(data.dataValidade) : null,
    });

    return this.formatarResponse(novoConteudo);
  }

  public async getById(conteudoId: number): Promise<ConteudoResponse> {
    const conteudo = await this.conteudoRepository.buscarPorId(conteudoId);

    if (!conteudo) {
      throw new AppError("Conteúdo não encontrado.", 404);
    }

    return this.formatarResponse(conteudo);
  }

  public async list(
    filters: ListarConteudosDTO = {},
  ): Promise<ListarConteudosResponse> {
    const { tipo, limit = 20, busca, orderBy = "recent", page = 1 } = filters;

    const skip = (page - 1) * limit;

    const whereClause: Prisma.ConteudoWhereInput = {};
    if (tipo) whereClause.tipo = tipo;
    if (busca) {
      whereClause.titulo = { contains: busca, mode: "insensitive" };
    }

     const [conteudos, total] = await Promise.all([
    this.conteudoRepository.listar({
      where: whereClause,
      orderBy: { dataPublicacao: orderBy === 'recent' ? 'desc' : 'asc' },
      take: limit,
      skip,
    }),
    this.conteudoRepository.contar(whereClause),
  ]);

    return {
    data: conteudos.map((conteudo) => this.formatarResponse(conteudo)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
  }

  public async update(
    conteudoId: number,
    data: UpdateConteudoDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<ConteudoResponse> {
    const conteudoExistente = await this.conteudoRepository.buscarPorId(conteudoId);

    if (!conteudoExistente) {
      throw new AppError("Conteúdo não encontrado.", 404);
    }

    const podeAtualizar = conteudoExistente.usuarioId === usuarioId || perfil === Perfis.ADMINISTRADOR || perfil === Perfis.PASTOR;

    if (!podeAtualizar) {
      throw new AppError("Você não tem permissão para atualizar este conteúdo.", 403);
    }

    const updateData: Prisma.ConteudoUpdateInput = {};

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

    const conteudoAtualizado = await this.conteudoRepository.atualizar(
      conteudoId,
      updateData,
    );

    return this.formatarResponse(conteudoAtualizado);
  }

  public async delete(
    conteudoId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const conteudoExistente = await this.conteudoRepository.buscarParaPermissao(conteudoId);

    if (!conteudoExistente) {
      throw new AppError("Conteúdo não encontrado.", 404);
    }

    const podeDeletar = conteudoExistente.usuarioId === usuarioId || perfil === Perfis.ADMINISTRADOR || perfil === Perfis.PASTOR;

    if (!podeDeletar) {
      throw new AppError("Você não tem permissão para excluir este conteúdo.", 403);
    }

    await this.conteudoRepository.deletar(conteudoId);
  }

  private formatarResponse(conteudo: ConteudoComUsuarioSimples): ConteudoResponse {
    return {
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
        id: conteudo.usuario?.id ?? 0,
        nomeCompleto: conteudo.usuario?.nomeCompleto ?? "",
        perfil: conteudo.usuario?.perfil ?? "",
      },
    };
  }
}