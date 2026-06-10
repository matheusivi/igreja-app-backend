// src/services/__tests__/pedidoOracao.service.test.ts
import { PedidoOracaoService } from '../pedidoOracao.services';
import { PedidoOracaoRepository } from '../../repository/pedidoOracao.repository';
import { UsuarioRepository } from '../../repository/usuario.repository';
import { AppError } from '../../utils/AppError';
import { Perfis } from '../../constants/perfis';

// Mocks
jest.mock('../../repository/pedidoOracao.repository');
jest.mock('../../repository/usuario.repository');

const MockPedidoOracaoRepository = PedidoOracaoRepository as jest.MockedClass<typeof PedidoOracaoRepository>;
const MockUsuarioRepository = UsuarioRepository as jest.MockedClass<typeof UsuarioRepository>;

// Factories
const makeUsuario = (overrides = {}) => ({
  id: 1,
  nomeCompleto: 'João Silva',
  email: 'joao@email.com',
  perfil: 'Membro',
  sexo: 'Masculino',
  dataNascimento: null,
  exibirAniversario: true,
  estadoCivil: null,
  fotoUrl: null,
  profissao: null,
  ...overrides,
});

const makePedido = (overrides = {}) => ({
  id: 1,
  autorUsuarioId: 1,
  descricaoPedido: 'Pedido de oração para minha família',
  dataEnvio: new Date('2026-01-01T10:00:00Z'),
  visibilidade: 'todos',
  autor: {
    id: 1,
    nomeCompleto: 'João Silva',
    perfil: 'Membro',
  },
  ...overrides,
});

describe('PedidoOracaoService', () => {
  let service: PedidoOracaoService;
  let pedidoRepo: jest.Mocked<PedidoOracaoRepository>;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    pedidoRepo = new MockPedidoOracaoRepository() as jest.Mocked<PedidoOracaoRepository>;
    usuarioRepo = new MockUsuarioRepository() as jest.Mocked<UsuarioRepository>;
    service = new PedidoOracaoService(usuarioRepo, pedidoRepo);
  });

  // ========================
  // CREATE
  // ========================
  describe('create', () => {
    it('deve criar um pedido de oração com sucesso', async () => {
      const usuario = makeUsuario();
      const pedido = makePedido();

      usuarioRepo.buscarPorId.mockResolvedValue(usuario);
      pedidoRepo.criar.mockResolvedValue(pedido);

      const resultado = await service.create(
        { descricaoPedido: 'Pedido de oração para minha família' },
        1,
      );

      expect(usuarioRepo.buscarPorId).toHaveBeenCalledWith(1);
      expect(pedidoRepo.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          descricaoPedido: 'Pedido de oração para minha família',
          visibilidade: 'todos',
        }),
      );
      expect(resultado.id).toBe(1);
      expect(resultado.visibilidade).toBe('todos');
      expect(resultado.autor.nomeCompleto).toBe('João Silva');
    });

    it('deve lançar erro 400 se o usuário não for encontrado', async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(null);

      await expect(
        service.create({ descricaoPedido: 'Pedido teste' }, 999),
      ).rejects.toThrow(new AppError('Usuário não encontrado', 400));

      expect(pedidoRepo.criar).not.toHaveBeenCalled();
    });
  });

  // ========================
  // LIST
  // ========================
  describe('list', () => {
    it('deve listar pedidos de oração sem filtros', async () => {
      const pedidos = [makePedido(), makePedido({ id: 2, descricaoPedido: 'Outro pedido' })];
      pedidoRepo.listar.mockResolvedValue(pedidos);

      const resultado = await service.list();

      expect(pedidoRepo.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { dataEnvio: 'desc' },
          take: 20,
          skip: 0,
        }),
      );
      expect(resultado).toHaveLength(2);
    });

    it('deve aplicar filtro de busca corretamente', async () => {
      pedidoRepo.listar.mockResolvedValue([makePedido()]);

      await service.list({ busca: 'família', limit: 10, page: 2 });

      expect(pedidoRepo.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { descricaoPedido: { contains: 'família', mode: 'insensitive' } },
          take: 10,
          skip: 10,
        }),
      );
    });

    it('deve retornar lista vazia quando não há pedidos', async () => {
      pedidoRepo.listar.mockResolvedValue([]);

      const resultado = await service.list();

      expect(resultado).toHaveLength(0);
    });
  });

  // ========================
  // DELETE
  // ========================
  describe('delete', () => {
    it('deve permitir que o autor delete seu próprio pedido', async () => {
      pedidoRepo.buscarParaPermissao.mockResolvedValue({ id: 1, autorUsuarioId: 1 });
      pedidoRepo.deletar.mockResolvedValue(undefined as any);

      await service.delete(1, 1, Perfis.MEMBRO);

      expect(pedidoRepo.deletar).toHaveBeenCalledWith(1);
    });

    it('deve permitir que o Administrador delete qualquer pedido', async () => {
      pedidoRepo.buscarParaPermissao.mockResolvedValue({ id: 1, autorUsuarioId: 5 });
      pedidoRepo.deletar.mockResolvedValue(undefined as any);

      await service.delete(1, 99, Perfis.ADMINISTRADOR);

      expect(pedidoRepo.deletar).toHaveBeenCalledWith(1);
    });

    it('deve permitir que o Pastor delete qualquer pedido', async () => {
      pedidoRepo.buscarParaPermissao.mockResolvedValue({ id: 1, autorUsuarioId: 5 });
      pedidoRepo.deletar.mockResolvedValue(undefined as any);

      await service.delete(1, 99, Perfis.PASTOR);

      expect(pedidoRepo.deletar).toHaveBeenCalledWith(1);
    });

    it('deve lançar erro 403 se Membro tentar deletar pedido de outro usuário', async () => {
      pedidoRepo.buscarParaPermissao.mockResolvedValue({ id: 1, autorUsuarioId: 5 });

      await expect(
        service.delete(1, 99, Perfis.MEMBRO),
      ).rejects.toThrow(new AppError('Você não tem permissão para excluir este pedido', 403));

      expect(pedidoRepo.deletar).not.toHaveBeenCalled();
    });

    it('deve lançar erro 403 se Líder tentar deletar pedido de outro usuário', async () => {
      pedidoRepo.buscarParaPermissao.mockResolvedValue({ id: 1, autorUsuarioId: 5 });

      await expect(
        service.delete(1, 99, Perfis.LIDER),
      ).rejects.toThrow(new AppError('Você não tem permissão para excluir este pedido', 403));

      expect(pedidoRepo.deletar).not.toHaveBeenCalled();
    });

    it('deve lançar erro 404 se o pedido não for encontrado', async () => {
      pedidoRepo.buscarParaPermissao.mockResolvedValue(null);

      await expect(
        service.delete(999, 1, Perfis.ADMINISTRADOR),
      ).rejects.toThrow(new AppError('Pedido de oração não encontrado.', 404));

      expect(pedidoRepo.deletar).not.toHaveBeenCalled();
    });
  });
});