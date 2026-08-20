import type {
  ListarProfissionaisResponse,
  ListarUsuariosQuery,
  ListarUsuariosResponse,
  UsuarioPerfilResponse,
  AniversariantesResponse,
} from "../dtos/usuario.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { chavesPorTermo } from "../domain/profissoes";
import { AppError } from "../utils/AppError";

export class UsuarioService {
  private usuarioRepository: UsuarioRepository;

  constructor(usuarioRepository?: UsuarioRepository) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
  }

  public async listar(
    filters: ListarUsuariosQuery = {},
  ): Promise<ListarUsuariosResponse> {
    const { busca, perfil, sexo, limit = 20, page = 1 } = filters;

    const skip = (page - 1) * limit;

    /**
     * ═══ SAIU DO `findMany` ═══
     * Era `contains` com `mode: "insensitive"`, que ignora maiúscula e NÃO
     * ignora acento: "jose" não achava "José", "conceicao" não achava
     * "Conceição". Ninguém digita acento no celular com pressa, então na
     * prática a busca falhava justamente nos nomes mais comuns da igreja.
     *
     * A normalização é função SQL, e o Prisma não expõe função dentro do
     * `where` — daí a consulta crua no repositório. O filtro agora também
     * alcança o nome da FAMÍLIA, para uma caixa só responder "quem é o
     * João?" e "quem são os Souza?".
     */
    const filtro = { busca, perfil, sexo };

    const [usuarios, total] = await Promise.all([
      this.usuarioRepository.buscarComFamilia({ ...filtro, take: limit, skip }),
      this.usuarioRepository.contarComFamilia(filtro),
    ]);

    return {
      data: usuarios,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * O diretório profissional da comunidade.
   *
   * A ideia: a igreja conhece o trabalho da própria gente. Quem precisa de um
   * pedreiro procura aqui antes de procurar fora, e a renda circula dentro da
   * comunidade.
   *
   * As duas travas (opt-in e maioridade) vivem na consulta do repositório, e
   * não neste serviço, de propósito: contagem e listagem usam o MESMO filtro.
   * Se a regra morasse aqui, um dia alguém acrescentaria um método que
   * esquece de aplicá-la.
   */
  public async listarProfissionais(
    busca?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ListarProfissionaisResponse> {
    const skip = (page - 1) * limit;

    /**
     * O termo vira também uma lista de CHAVES antes de descer para o banco.
     *
     * A coluna guarda `eletronica`; a pessoa lê e digita "consertos". Sem
     * esta tradução a busca falharia calada exatamente onde chave e rótulo
     * divergem — e quem procura ninguém encontraria, concluindo que a igreja
     * não tem quem faça aquilo.
     *
     * De quebra, o nome da CATEGORIA também casa: "saúde" devolve médico,
     * enfermeiro e dentista de uma vez, que é a única forma de navegar por
     * seção numa tela com uma caixa de busca só.
     */
    const chaves = chavesPorTermo(busca);

    const [profissionais, total] = await Promise.all([
      this.usuarioRepository.buscarProfissionais({ busca, chaves, take: limit, skip }),
      this.usuarioRepository.contarProfissionais(busca, chaves),
    ]);

    return {
      data: profissionais,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async buscarPerfil(usuarioId: number): Promise<UsuarioPerfilResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    return {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      perfil: usuario.perfil,
      sexo: usuario.sexo,
      fotoUrl: usuario.fotoUrl,
      dataNascimento: usuario.dataNascimento,
      exibirAniversario: usuario.exibirAniversario,
      estadoCivil: usuario.estadoCivil,
      profissao: usuario.profissao,
      batizado: usuario.batizado,
    };
  }

  public async aniversariantes(mes?: number): Promise<AniversariantesResponse> {
    const mesConsultado = mes ?? new Date().getMonth() + 1;

    const resultados =
      await this.usuarioRepository.buscarAniversariantes(mesConsultado);

    // agrupar por dia
    const porDia = new Map<
      number,
      {
        id: number;
        nomeCompleto: string;
        fotoUrl: string | null;
        perfil: string;
        familia: string | null;
        familiaFoto: string | null;
        profissao: string | null;
      }[]
    >();

    for (const usuario of resultados) {
      const dia = usuario.dia;
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push({
        id: usuario.id,
        nomeCompleto: usuario.nomeCompleto,
        fotoUrl: usuario.fotoUrl,
        perfil: usuario.perfil,
        // `?? null` porque o `$queryRaw` devolve `undefined` quando a coluna
        // vem nula em alguns drivers, e o contrato do DTO é `string | null`.
        familia: usuario.familia ?? null,
        familiaFoto: usuario.familiaFoto ?? null,
        profissao: usuario.profissao ?? null,
      });
    }

    return {
      mes: mesConsultado,
      data: Array.from(porDia.entries()).map(([dia, aniversariantes]) => ({
        dia,
        aniversariantes,
      })),
    };
  }
}
