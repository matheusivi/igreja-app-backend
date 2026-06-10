import type {
  CreateGrupoFamiliarDTO,
  ConvidarMembroDTO,
  ResponderConviteDTO,
  GrupoFamiliarResponse,
  GrupoFamiliarComMembros,
  MembroFamiliaResponse,
} from '../dtos/grupoFamiliar.dto';
import { UsuarioRepository } from '../repository/usuario.repository';
import { GrupoFamiliarRepository } from '../repository/grupoFamiliar.repository';
import { AppError } from '../utils/AppError';
import { Perfis } from '../constants/perfis';
import { ListarGruposFamiliaresResponse } from '../dtos/grupoFamiliar.dto';

export class GrupoFamiliarService {
  private usuarioRepository: UsuarioRepository;
  private grupoFamiliarRepository: GrupoFamiliarRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    grupoFamiliarRepository?: GrupoFamiliarRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.grupoFamiliarRepository = grupoFamiliarRepository ?? new GrupoFamiliarRepository();
  }

  public async create(
    data: CreateGrupoFamiliarDTO,
    usuarioId: number,
  ): Promise<GrupoFamiliarResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError('Usuário não encontrado.', 404);

    const novoGrupo = await this.grupoFamiliarRepository.criar({
      nome: data.nome || null,
      criador: { connect: { id: usuarioId } },
      membros: {
        create: {
          usuario: { connect: { id: usuarioId } },
          convidadoPor: { connect: { id: usuarioId } },
          parentesco: 'Criador',
          status: 'aceito',
        },
      },
    });

    return this.formatarResponse(novoGrupo);
  }

  public async convidar(
    grupoId: number,
    data: ConvidarMembroDTO,
    usuarioId: number,
  ): Promise<void> {
    if (data.usuarioId === usuarioId) {
      throw new AppError('Você não pode convidar a si mesmo para o grupo.', 400);
    }
       
    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError('Grupo familiar não encontrado.', 404);

    const membroConvidador = await this.grupoFamiliarRepository.buscarMembroPorUsuarioEGrupo(
      usuarioId,
      grupoId,
    );

    if (!membroConvidador || membroConvidador.status !== 'aceito') {
      throw new AppError('Você precisa fazer parte do grupo para convidar membros.', 403);
    }

    const usuarioConvidado = await this.usuarioRepository.buscarPorId(data.usuarioId);
    if (!usuarioConvidado) throw new AppError('Usuário convidado não encontrado.', 404);

    const jaExiste = await this.grupoFamiliarRepository.buscarMembroPorUsuarioEGrupo(
      data.usuarioId,
      grupoId,
    );
    if (jaExiste) throw new AppError('Este usuário já foi convidado ou já faz parte do grupo.', 409);

    await this.grupoFamiliarRepository.criarConvite({
      usuario: { connect: { id: data.usuarioId } },
      grupoFamiliar: { connect: { id: grupoId } },
      convidadoPor: { connect: { id: usuarioId } },
      parentesco: data.parentesco || null,
      status: 'pendente',
    });
  }

  public async responderConvite(
    membroId: number,
    data: ResponderConviteDTO,
    usuarioId: number,
  ): Promise<void> {
    const membro = await this.grupoFamiliarRepository.buscarMembroPorId(membroId);
    if (!membro) throw new AppError('Convite não encontrado.', 404);

    if (membro.usuarioId !== usuarioId) {
      throw new AppError('Você não tem permissão para responder este convite.', 403);
    }

    if (membro.status !== 'pendente') {
      throw new AppError('Este convite já foi respondido.', 409);
    }

    await this.grupoFamiliarRepository.atualizarStatusConvite(membroId, data.status);
  }

  public async getById(grupoId: number): Promise<GrupoFamiliarResponse> {
    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError('Grupo familiar não encontrado.', 404);

    return this.formatarResponse(grupo);
  }

public async getByUsuario(
  usuarioId: number,
  page: number = 1,
  limit: number = 20,
): Promise<ListarGruposFamiliaresResponse> {
  const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
  if (!usuario) throw new AppError('Usuário não encontrado.', 404);

  const skip = (page - 1) * limit;

  const [grupos, total] = await Promise.all([
    this.grupoFamiliarRepository.buscarPorUsuario(usuarioId, skip, limit),
    this.grupoFamiliarRepository.contarPorUsuario(usuarioId),
  ]);

  return {
    data: grupos.map((grupo) => this.formatarResponse(grupo)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

  public async removerMembro(
    grupoId: number,
    membroUsuarioId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError('Grupo familiar não encontrado.', 404);

    const membro = await this.grupoFamiliarRepository.buscarMembroPorUsuarioEGrupo(
      membroUsuarioId,
      grupoId,
    );
    if (!membro) throw new AppError('Membro não encontrado no grupo.', 404);

    const podeRemover =
      usuarioId === membroUsuarioId ||
      perfil === Perfis.ADMINISTRADOR ||
      perfil === Perfis.PASTOR ||
      grupo.criadorUsuarioId === usuarioId;

    if (!podeRemover) {
      throw new AppError('Você não tem permissão para remover este membro.', 403);
    }

    await this.grupoFamiliarRepository.removerMembro(membroUsuarioId, grupoId);

     const membrosRestantes = await this.grupoFamiliarRepository.contarMembrosAtivos(grupoId);
  if (membrosRestantes === 0) {
    await this.grupoFamiliarRepository.deletarGrupo(grupoId);
  }
  }

  private formatarResponse(grupo: GrupoFamiliarComMembros): GrupoFamiliarResponse {
    return {
      id: grupo.id,
      nome: grupo.nome,
      membros: grupo.membros.map((m): MembroFamiliaResponse => ({
        id: m.id,
        parentesco: m.parentesco,
        status: m.status,
        usuario: {
          id: m.usuario?.id ?? 0,
          nomeCompleto: m.usuario?.nomeCompleto ?? '',
          perfil: m.usuario?.perfil ?? '',
          fotoUrl: m.usuario?.fotoUrl ?? null,
        },
        convidadoPor: {
          id: m.convidadoPor?.id ?? 0,
          nomeCompleto: m.convidadoPor?.nomeCompleto ?? '',
        },
      })),
    };
  }
}