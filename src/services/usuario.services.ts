import type {
  ListarUsuariosQuery,
  ListarUsuariosResponse,
  UsuarioPerfilResponse,
  AniversariantesResponse,
} from "../dtos/usuario.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";

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

    const whereClause: Prisma.UsuarioWhereInput = {};
    if (busca) {
      whereClause.nomeCompleto = { contains: busca, mode: "insensitive" };
    }
    if (perfil) whereClause.perfil = perfil;
    if (sexo) whereClause.sexo = sexo;

    const [usuarios, total] = await Promise.all([
      this.usuarioRepository.listar({
        where: whereClause,
        take: limit,
        skip,
      }),
      this.usuarioRepository.contar(whereClause),
    ]);

    return {
      data: usuarios,
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
    };
  }

  public async aniversariantes(mes?: number): Promise<AniversariantesResponse> {
    const mesConsultado = mes ?? new Date().getMonth() + 1;

    const resultados =
      await this.usuarioRepository.buscarAniversariantes(mesConsultado);

    // agrupar por dia
    const porDia = new Map<
      number,
      { id: number; nomeCompleto: string; fotoUrl: string | null }[]
    >();

    for (const usuario of resultados) {
      const dia = usuario.dia;
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push({
        id: usuario.id,
        nomeCompleto: usuario.nomeCompleto,
        fotoUrl: usuario.fotoUrl,
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
