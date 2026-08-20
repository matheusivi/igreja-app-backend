import { Perfis } from "../constants/perfis";
import { extrairPublicId, removerImagem } from "../lib/cloudinary";
import { ConfiguracaoRepository } from "../repository/configuracao.repository";
import { AppError } from "../utils/AppError";

export type ConfiguracaoResponse = {
  heroImagemUrl: string | null;
  versiculoHome: string | null;
};

/**
 * O que a igreja pode mudar na cara do app sem um deploy.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * A capa e o versículo do topo da Home estavam no CÓDIGO: trocar a frase
 * exigia editar um arquivo e publicar uma versão nova; trocar a foto exigia
 * commitar um arquivo em `assets/`. Nenhum pastor faz deploy, então na
 * prática os dois eram imutáveis.
 *
 * ═══ QUEM PODE MUDAR ═══
 * Só Pastor e Administrador. Líder fica de fora de propósito: isto é a
 * primeira coisa que todo membro vê ao abrir o app — é a cara da igreja, não
 * a de um ministério.
 */
export class ConfiguracaoService {
  private repo: ConfiguracaoRepository;

  constructor(repo?: ConfiguracaoRepository) {
    this.repo = repo ?? new ConfiguracaoRepository();
  }

  public async obter(): Promise<ConfiguracaoResponse> {
    const config = await this.repo.obter();
    return {
      heroImagemUrl: config.heroImagemUrl,
      versiculoHome: config.versiculoHome,
    };
  }

  public async atualizar(
    data: {
      heroImagemUrl?: string | null | undefined;
      versiculoHome?: string | null | undefined;
    },
    perfil: string,
  ): Promise<ConfiguracaoResponse> {
    if (perfil !== Perfis.PASTOR && perfil !== Perfis.ADMINISTRADOR) {
      throw new AppError(
        "Só o pastor ou o administrador podem alterar a tela inicial.",
        403,
      );
    }

    const anterior = await this.repo.obter();
    const atualizada = await this.repo.atualizar(data);

    /**
     * Apaga a capa antiga do Cloudinary quando ela é TROCADA ou REMOVIDA.
     *
     * Sem isto, cada troca deixa um arquivo órfão pagando armazenamento para
     * sempre — ninguém mais tem a URL, então nunca seria encontrado para
     * apagar depois. É o mesmo cuidado que a foto de perfil já tinha.
     *
     * A remoção vem DEPOIS de gravar: se a gravação falhar, a imagem antiga
     * continua sendo a válida, e tê-la apagado deixaria a Home apontando para
     * um arquivo inexistente.
     */
    if (
      data.heroImagemUrl !== undefined &&
      anterior.heroImagemUrl &&
      anterior.heroImagemUrl !== data.heroImagemUrl
    ) {
      const publicId = extrairPublicId(anterior.heroImagemUrl);
      if (publicId) await removerImagem(publicId);
    }

    return {
      heroImagemUrl: atualizada.heroImagemUrl,
      versiculoHome: atualizada.versiculoHome,
    };
  }
}
