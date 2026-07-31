// src/services/curso.service.ts
import type {
  CreateCursoDTO,
  UpdateCursoDTO,
  CursoResponse,
  ListCursosQuery,
  CursoComCriadorSimples,
  ListarCursosResponse,
} from "../dtos/curso.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { CursoRepository } from "../repository/curso.repository";
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";
import { Perfis } from "../constants/perfis";

export class CursoService {
  private usuarioRepository: UsuarioRepository;
  private cursoRepository: CursoRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    cursoRepository?: CursoRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.cursoRepository = cursoRepository ?? new CursoRepository();
  }

  public async create(
    data: CreateCursoDTO,
    usuarioId: number,
  ): Promise<CursoResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const novoCurso = await this.cursoRepository.criar({
      criador: { connect: { id: usuarioId } },
      nome: data.nome,
      descricaoMaterial: data.descricaoMaterial || null,
      categoria: data.categoria,
      duracao: data.duracao || null,
      publicoAlvo: data.publicoAlvo || null,
    });

    if (data.capitulos?.length) {
      await this.cursoRepository.substituirCapitulos(
        novoCurso.id,
        data.capitulos,
      );
    }

    // Relê para a resposta já sair com a ementa gravada.
    return this.getById(novoCurso.id);
  }

  public async getById(cursoId: number): Promise<CursoResponse> {
    const curso = await this.cursoRepository.buscarPorId(cursoId);

    if (!curso) {
      throw new AppError("Curso não encontrado.", 404);
    }

    return this.formatarResponse(curso);
  }

public async list(filters: ListCursosQuery = {}): Promise<ListarCursosResponse> {
  const {
    categoria,
    busca,
    limit = 20,
    page = 1,
    orderBy = 'recent',
  } = filters;

  const skip = (page - 1) * limit;

  const whereClause: Prisma.CursoWhereInput = {
    ...(categoria && { categoria }),
    ...(busca && {
      nome: { contains: busca, mode: 'insensitive' },
    }),
  };

  const [itens, total] = await Promise.all([
    this.cursoRepository.listar({
      where: whereClause,
      orderBy: { id: orderBy === 'oldest' ? 'asc' : 'desc' },
      take: limit,
      skip,
    }),
    this.cursoRepository.contar(whereClause),
  ]);

  return {
    data: itens.map((item) => this.formatarResponse(item)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

 public async update(
  cursoId: number,
  data: UpdateCursoDTO,
  usuarioId: number,
  perfil: string,
): Promise<CursoResponse> {
  const cursoExistente = await this.cursoRepository.buscarPorId(cursoId);
  if (!cursoExistente) throw new AppError('Curso não encontrado.', 404);

  const podeAtualizar =
    perfil === Perfis.ADMINISTRADOR ||
    perfil === Perfis.PASTOR ||
    cursoExistente.criadorUsuarioId === usuarioId;

  if (!podeAtualizar) {
    throw new AppError('Você não tem permissão para atualizar este curso.', 403);
  }

  const updateData: Prisma.CursoUpdateInput = {};
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.descricaoMaterial !== undefined) updateData.descricaoMaterial = data.descricaoMaterial;
  if (data.categoria !== undefined) updateData.categoria = data.categoria;
  if (data.duracao !== undefined) updateData.duracao = data.duracao;
  if (data.publicoAlvo !== undefined) updateData.publicoAlvo = data.publicoAlvo;

  await this.cursoRepository.atualizar(cursoId, updateData);

  // Campo ausente = "não mexer na ementa". Lista vazia = "apagar a ementa".
  if (data.capitulos !== undefined) {
    await this.cursoRepository.substituirCapitulos(cursoId, data.capitulos);
  }

  return this.getById(cursoId);
}

public async delete(
  cursoId: number,
  usuarioId: number,
  perfil: string,
): Promise<void> {
  const cursoExistente = await this.cursoRepository.buscarParaPermissao(cursoId);
  if (!cursoExistente) throw new AppError('Curso não encontrado.', 404);

  const podeExcluir =
    perfil === Perfis.ADMINISTRADOR ||
    perfil === Perfis.PASTOR ||
    cursoExistente.criadorUsuarioId === usuarioId;

  if (!podeExcluir) {
    throw new AppError('Você não tem permissão para excluir este curso.', 403);
  }

  // Excluir um curso derruba turmas e matrículas em cascata — some o registro
  // de quem estudou o quê, sem volta. Por isso só o Administrador pode fazer
  // isso quando já existe histórico. Pastor e líder excluem apenas cursos que
  // ninguém chegou a cursar (cadastro errado, teste, duplicata).
  if (perfil !== Perfis.ADMINISTRADOR) {
    const matriculas = await this.cursoRepository.contarMatriculas(cursoId);
    if (matriculas > 0) {
      throw new AppError(
        `Este curso já tem ${matriculas} matrícula(s) registradas. Excluí-lo apagaria o histórico de quem participou, e só o administrador pode fazer isso.`,
        403,
      );
    }
  }

  await this.cursoRepository.deletar(cursoId);
}

  private formatarResponse(curso: CursoComCriadorSimples): CursoResponse {
    return {
      id: curso.id,
      nome: curso.nome,
      descricaoMaterial: curso.descricaoMaterial || undefined,
      categoria: curso.categoria,
      duracao: curso.duracao,
      publicoAlvo: curso.publicoAlvo,
      capitulos: curso.capitulos ?? [],
      criador: {
        id: curso.criador?.id ?? 0,
        nomeCompleto: curso.criador?.nomeCompleto ?? "",
        perfil: curso.criador?.perfil ?? "",
      },
    };
  }
}