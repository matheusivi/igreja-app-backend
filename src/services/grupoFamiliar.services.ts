import type {
  CreateGrupoFamiliarDTO,
  UpdateGrupoFamiliarDTO,
  ConvidarMembroDTO,
  ResponderConviteDTO,
  GrupoFamiliarResponse,
  GrupoFamiliarComMembros,
  MembroFamiliaResponse,
  ConviteFamiliaPendenteResponse,
} from "../dtos/grupoFamiliar.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { GrupoFamiliarRepository } from "../repository/grupoFamiliar.repository";
import { AppError } from "../utils/AppError";
import { Perfis } from "../constants/perfis";
import { ListarGruposFamiliaresResponse } from "../dtos/grupoFamiliar.dto";
import { Prisma } from "@prisma/client";
import { extrairPublicId, removerImagem } from "../lib/cloudinary";

export class GrupoFamiliarService {
  private usuarioRepository: UsuarioRepository;
  private grupoFamiliarRepository: GrupoFamiliarRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    grupoFamiliarRepository?: GrupoFamiliarRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.grupoFamiliarRepository =
      grupoFamiliarRepository ?? new GrupoFamiliarRepository();
  }

  public async create(
    data: CreateGrupoFamiliarDTO,
    usuarioId: number,
  ): Promise<GrupoFamiliarResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    // Cada pessoa pertence a uma família. Sem esta checagem dava para criar
    // grupos indefinidamente, e a mesma pessoa apareceria em vários — o app
    // inteiro (Perfil, aba Grupos) assume que existe no máximo um.
    const jaTemGrupo =
      await this.grupoFamiliarRepository.contarPorUsuario(usuarioId);
    if (jaTemGrupo > 0) {
      throw new AppError(
        "Você já faz parte de um grupo familiar. Saia dele antes de criar outro.",
        409,
      );
    }

    const novoGrupo = await this.grupoFamiliarRepository.criar({
      nome: data.nome || null,
      imagemUrl: data.imagemUrl || null,
      criador: { connect: { id: usuarioId } },
      membros: {
        create: {
          usuario: { connect: { id: usuarioId } },
          convidadoPor: { connect: { id: usuarioId } },
          // Sem "Criador" aqui. Quem abriu o grupo já está em
          // `criadorUsuarioId`; gravar a mesma coisa como PAPEL criava uma
          // segunda fonte de verdade que o usuário podia digitar — bastava
          // ser convidado como "Criador" para aparecer como dono.
          // O papel real (pai, mãe...) a pessoa escolhe depois, na família.
          parentesco: null,
          status: "aceito",
        },
      },
    });

    return this.formatarResponse(novoGrupo);
  }

  /**
   * Atualiza nome e foto do grupo.
   *
   * Sem isto a foto só poderia ser definida no momento da criação — quem já
   * tinha grupo nunca conseguiria adicionar uma, e ninguém conseguiria trocar.
   */
  public async update(
    grupoId: number,
    data: UpdateGrupoFamiliarDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<GrupoFamiliarResponse> {
    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError("Grupo familiar não encontrado.", 404);

    const podeEditar =
      grupo.criadorUsuarioId === usuarioId ||
      perfil === Perfis.ADMINISTRADOR ||
      perfil === Perfis.PASTOR;

    if (!podeEditar) {
      throw new AppError(
        "Você não tem permissão para editar este grupo.",
        403,
      );
    }

    const updateData: Prisma.GrupoFamiliarUpdateInput = {};
    if (data.nome !== undefined) updateData.nome = data.nome || null;
    if (data.imagemUrl !== undefined) updateData.imagemUrl = data.imagemUrl;

    const grupoAtualizado = await this.grupoFamiliarRepository.atualizar(
      grupoId,
      updateData,
    );

    // Foto antiga vira lixo no Cloudinary se não for apagada aqui.
    if (
      data.imagemUrl !== undefined &&
      grupo.imagemUrl &&
      grupo.imagemUrl !== data.imagemUrl
    ) {
      const publicId = extrairPublicId(grupo.imagemUrl);
      if (publicId) await removerImagem(publicId);
    }

    return this.formatarResponse(grupoAtualizado);
  }

  public async convidar(
    grupoId: number,
    data: ConvidarMembroDTO,
    usuarioId: number,
  ): Promise<void> {
    if (data.usuarioId === usuarioId) {
      throw new AppError(
        "Você não pode convidar a si mesmo para o grupo.",
        400,
      );
    }

    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError("Grupo familiar não encontrado.", 404);

    const membroConvidador =
      await this.grupoFamiliarRepository.buscarMembroPorUsuarioEGrupo(
        usuarioId,
        grupoId,
      );

    if (!membroConvidador || membroConvidador.status !== "aceito") {
      throw new AppError(
        "Você precisa fazer parte do grupo para convidar membros.",
        403,
      );
    }

    const usuarioConvidado = await this.usuarioRepository.buscarPorId(
      data.usuarioId,
    );
    if (!usuarioConvidado)
      throw new AppError("Usuário convidado não encontrado.", 404);

    const jaExiste =
      await this.grupoFamiliarRepository.buscarMembroPorUsuarioEGrupo(
        data.usuarioId,
        grupoId,
      );
    if (jaExiste)
      throw new AppError(
        "Este usuário já foi convidado ou já faz parte do grupo.",
        409,
      );

    /**
     * ═══ A TERCEIRA PORTA ═══
     * Sem isto o convite era criado normalmente e só morria lá na frente, na
     * hora de aceitar. O resultado é o pior dos dois lados: quem convidou
     * acha que resolveu e fica esperando; quem foi convidado vê um cartão no
     * topo da tela de Grupos que só sabe dar erro.
     *
     * Falhar aqui é falhar cedo — a liderança descobre na hora e vai
     * conversar com a pessoa, que é o que resolve de verdade.
     *
     * O nome da outra família aparece de propósito: "já faz parte de um
     * grupo" deixa a pessoa sem próximo passo. Numa igreja em que as
     * famílias são públicas, dizer qual é não expõe nada e resolve.
     */
    const outroGrupo =
      await this.grupoFamiliarRepository.buscarGrupoAceitoDoUsuario(
        data.usuarioId,
      );
    if (outroGrupo) {
      throw new AppError(
        `${usuarioConvidado.nomeCompleto} já faz parte de ${outroGrupo.nome ?? "outro grupo familiar"}. Cada pessoa pertence a uma família por vez.`,
        409,
      );
    }

    await this.grupoFamiliarRepository.criarConvite({
      usuario: { connect: { id: data.usuarioId } },
      grupoFamiliar: { connect: { id: grupoId } },
      convidadoPor: { connect: { id: usuarioId } },
      parentesco: data.parentesco || null,
      status: "pendente",
    });
  }

  public async responderConvite(
    membroId: number,
    data: ResponderConviteDTO,
    usuarioId: number,
  ): Promise<void> {
    const membro =
      await this.grupoFamiliarRepository.buscarMembroPorId(membroId);
    if (!membro) throw new AppError("Convite não encontrado.", 404);

    if (membro.usuarioId !== usuarioId) {
      throw new AppError(
        "Você não tem permissão para responder este convite.",
        403,
      );
    }

    if (membro.status !== "pendente") {
      throw new AppError("Este convite já foi respondido.", 409);
    }

    /**
     * ═══ A MESMA REGRA, NA OUTRA PORTA ═══
     * O `create` já barrava quem tem família. Aceitar um convite não barrava
     * nada — e é a segunda porta para o mesmo cômodo:
     *
     *   1. Ana cria a família dela.        → 1 vínculo aceito
     *   2. Ana recebe convite da família B.
     *   3. Ana aceita.                     → 2 vínculos aceitos
     *
     * A regra "uma família por pessoa" tem que valer em TODO caminho que cria
     * vínculo, não só no mais óbvio. Meia regra é pior que nenhuma: o resto
     * do app (Perfil, aba Grupos, aniversariantes) assume que existe no
     * máximo uma família, e passa a mostrar coisa errada sem avisar.
     *
     * Recusar continua livre — sair nunca precisa de permissão.
     */
    if (data.status === "aceito") {
      const jaTemGrupo =
        await this.grupoFamiliarRepository.contarPorUsuario(usuarioId);
      if (jaTemGrupo > 0) {
        throw new AppError(
          "Você já faz parte de um grupo familiar. Saia dele antes de aceitar outro convite.",
          409,
        );
      }

      await this.grupoFamiliarRepository.aceitarConvite(membroId, usuarioId);
      return;
    }

    await this.grupoFamiliarRepository.atualizarStatusConvite(
      membroId,
      data.status,
    );
  }

  public async getById(grupoId: number): Promise<GrupoFamiliarResponse> {
    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError("Grupo familiar não encontrado.", 404);

    return this.formatarResponse(grupo);
  }

  /**
   * Todas as famílias da igreja, com busca.
   *
   * ═══ FAMÍLIA É DADO ABERTO AQUI — DECISÃO CONFIRMADA ═══
   * `getById` não tem verificação de permissão: qualquer usuário autenticado
   * abre qualquer família pelo id e vê todos os integrantes. A listagem não
   * abre uma porta — torna visível uma que já estava aberta.
   *
   * Isso foi levantado e CONFIRMADO como o comportamento desejado: numa
   * congregação as famílias são públicas entre si, e esconder quem mora com
   * quem atrapalharia o acolhimento sem proteger ninguém.
   *
   * O que continua fechado é o que MEXE: criar (uma família por pessoa),
   * convidar (só quem é da família), editar nome, foto e parentescos (só o
   * criador e a liderança). Ver é aberto; alterar, não.
   *
   * ⚠️  Se um dia a igreja mudar de ideia, a trava tem que ser posta nos DOIS
   * — aqui e no `getById` —, senão fecha-se a lista e o id continua servindo.
   */
  public async listar(
    busca?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ListarGruposFamiliaresResponse> {
    const skip = (page - 1) * limit;

    const [grupos, total] = await Promise.all([
      this.grupoFamiliarRepository.buscarFamilias({ busca, take: limit, skip }),
      this.grupoFamiliarRepository.contarFamilias(busca),
    ]);

    return {
      data: grupos.map((grupo) => this.formatarResponse(grupo)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getByUsuario(
    usuarioId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<ListarGruposFamiliaresResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

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

  public async getConvitesPendentes(
    usuarioId: number,
  ): Promise<ConviteFamiliaPendenteResponse[]> {
    const convites =
      await this.grupoFamiliarRepository.buscarConvitesPendentes(usuarioId);

    return convites.map((convite) => ({
      id: convite.id,
      grupoId: convite.grupoFamiliarId,
      nomeGrupo: convite.grupoFamiliar?.nome ?? null,
      parentesco: convite.parentesco,
      convidadoPor: {
        id: convite.convidadoPor?.id ?? 0,
        nomeCompleto: convite.convidadoPor?.nomeCompleto ?? "",
      },
    }));
  }

  /**
   * Define ou corrige o papel de um integrante.
   *
   * ═══ POR QUE ISTO PRECISAVA EXISTIR ═══
   * O parentesco só podia ser definido no CONVITE, por quem convidava, e
   * nunca mais. Errou? A única saída era remover a pessoa do grupo e
   * convidá-la de novo — o que, além de absurdo, dispara um convite pendente
   * e derruba o vínculo enquanto isso.
   *
   * Um cadastro que não pode ser corrigido não é mantido: fica errado e
   * ninguém mexe. E este cadastro em particular existe para responder quem
   * responde por qual criança na comunidade — o valor dele depende
   * inteiramente de estar certo.
   *
   * ═══ QUEM PODE ═══
   * O criador do grupo (a família cuida do próprio cadastro) e
   * Pastor/Administrador (a liderança arbitra). Deliberadamente NÃO é
   * qualquer integrante: se todo mundo pudesse editar, qualquer pessoa se
   * declararia pai de qualquer criança, e o registro perderia justamente a
   * função de fiscalização que motivou criá-lo.
   */
  public async atualizarPapel(
    grupoId: number,
    membroUsuarioId: number,
    parentesco: string | null,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError("Grupo familiar não encontrado.", 404);

    const podeEditar =
      grupo.criadorUsuarioId === usuarioId ||
      perfil === Perfis.PASTOR ||
      perfil === Perfis.ADMINISTRADOR;

    if (!podeEditar) {
      throw new AppError(
        "Só quem criou a família ou a liderança pode definir os papéis.",
        403,
      );
    }

    const membro =
      await this.grupoFamiliarRepository.buscarMembroPorUsuarioEGrupo(
        membroUsuarioId,
        grupoId,
      );
    if (!membro) throw new AppError("Membro não encontrado no grupo.", 404);

    // Convite pendente ainda não é vínculo. Definir o papel de quem não
    // aceitou seria registrar um parentesco que a própria pessoa não
    // confirmou — e é justamente isso que o registro não pode fazer.
    if (membro.status !== "aceito") {
      throw new AppError(
        "Esta pessoa ainda não aceitou o convite para a família.",
        409,
      );
    }

    await this.grupoFamiliarRepository.atualizarPapel(
      membroUsuarioId,
      grupoId,
      parentesco,
    );
  }

  public async removerMembro(
    grupoId: number,
    membroUsuarioId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const grupo = await this.grupoFamiliarRepository.buscarPorId(grupoId);
    if (!grupo) throw new AppError("Grupo familiar não encontrado.", 404);

    const membro =
      await this.grupoFamiliarRepository.buscarMembroPorUsuarioEGrupo(
        membroUsuarioId,
        grupoId,
      );
    if (!membro) throw new AppError("Membro não encontrado no grupo.", 404);

    const podeRemover =
      usuarioId === membroUsuarioId ||
      perfil === Perfis.ADMINISTRADOR ||
      perfil === Perfis.PASTOR ||
      grupo.criadorUsuarioId === usuarioId;

    if (!podeRemover) {
      throw new AppError(
        "Você não tem permissão para remover este membro.",
        403,
      );
    }

    await this.grupoFamiliarRepository.removerMembro(membroUsuarioId, grupoId);

    const membrosRestantes =
      await this.grupoFamiliarRepository.contarMembrosAtivos(grupoId);
    if (membrosRestantes === 0) {
      await this.grupoFamiliarRepository.deletarGrupo(grupoId);
    }
  }

  private formatarResponse(
    grupo: GrupoFamiliarComMembros,
  ): GrupoFamiliarResponse {
    return {
      id: grupo.id,
      nome: grupo.nome,
      imagemUrl: grupo.imagemUrl,
      criadorUsuarioId: grupo.criadorUsuarioId,
      membros: grupo.membros.map(
        (m): MembroFamiliaResponse => ({
          id: m.id,
          parentesco: m.parentesco,
          status: m.status,
          usuario: {
            id: m.usuario?.id ?? 0,
            nomeCompleto: m.usuario?.nomeCompleto ?? "",
            perfil: m.usuario?.perfil ?? "",
            fotoUrl: m.usuario?.fotoUrl ?? null,
            sexo: m.usuario?.sexo ?? null,
          },
          convidadoPor: {
            id: m.convidadoPor?.id ?? 0,
            nomeCompleto: m.convidadoPor?.nomeCompleto ?? "",
          },
        }),
      ),
    };
  }
}
