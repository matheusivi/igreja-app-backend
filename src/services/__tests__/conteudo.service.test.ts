// src/services/__tests__/conteudo.service.test.ts

import { ConteudoService } from '../conteudo.services';
import { UsuarioRepository } from '../../repository/usuario.repository';
import { ConteudoRepository } from '../../repository/conteudo.repository';
import type { CreateConteudoDTO, UpdateConteudoDTO, ListarConteudosDTO } from '../../dtos/conteudo.dto';

describe('ConteudoService', () => {
    let service: ConteudoService;
    let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
    let mockConteudoRepository: jest.Mocked<ConteudoRepository>;

    const mockUsuario = {
        id: 1,
        nomeCompleto: 'João Silva',
        perfil: 'Usuario',
    };

    const mockConteudo = {
        id: 10,
        usuarioId: 1,                    // ← Importante para permissão
        tipo: 'Aviso',
        titulo: 'Meu primeiro post',
        texto: 'Conteúdo de teste',
        imagemUrl: null,
        videoUrl: null,
        formato: 'texto',
        principal: false,
        dataPublicacao: new Date('2024-01-01'),
        dataValidade: null,
        usuario: mockUsuario,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsuarioRepository = {
            buscarPorId: jest.fn(),
        } as unknown as jest.Mocked<UsuarioRepository>;

        mockConteudoRepository = {
            criar: jest.fn(),
            buscarPorId: jest.fn(),
            listar: jest.fn(),
            atualizar: jest.fn(),
            deletar: jest.fn(),
            buscarParaPermissao: jest.fn(),
        } as unknown as jest.Mocked<ConteudoRepository>;

        service = new ConteudoService(mockUsuarioRepository, mockConteudoRepository);
    });

    // ========================
    // CREATE
    // ========================
    describe('create', () => {
        it('deve criar um conteúdo com sucesso quando usuário existe', async () => {
            mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);
            mockConteudoRepository.criar.mockResolvedValue(mockConteudo as any);

            const dto: CreateConteudoDTO = {
                tipo: 'Aviso',
                titulo: 'Meu primeiro post',
                texto: 'Conteúdo de teste',
                formato: 'texto',
            };

            const resultado = await service.create(dto, 1);

            expect(mockUsuarioRepository.buscarPorId).toHaveBeenCalledWith(1);
            expect(mockConteudoRepository.criar).toHaveBeenCalledWith(expect.objectContaining({
                usuario: { connect: { id: 1 } },
                tipo: 'Aviso',
            }));

            expect(resultado.titulo).toBe('Meu primeiro post');
        });
    });

    // ========================
    // GET BY ID
    // ========================
    describe('getById', () => {
        it('deve retornar um conteúdo quando encontrado', async () => {
            mockConteudoRepository.buscarPorId.mockResolvedValue(mockConteudo as any);

            const resultado = await service.getById(10);

            expect(resultado.id).toBe(10);
        });
    });

    // ========================
    // LIST
    // ========================
    describe('list', () => {
        it('deve listar conteúdos com filtros padrão', async () => {
            mockConteudoRepository.listar.mockResolvedValue([mockConteudo] as any);

            const resultado = await service.list();

            expect(resultado).toHaveLength(1);
        });
    });

    // ========================
    // UPDATE
    // ========================
    describe('update', () => {
        it('deve atualizar conteúdo quando o usuário é o autor', async () => {
            mockConteudoRepository.buscarPorId.mockResolvedValue(mockConteudo as any);
            mockConteudoRepository.atualizar.mockResolvedValue({
                ...mockConteudo,
                titulo: 'Título atualizado'
            } as any);

            const dto: UpdateConteudoDTO = { titulo: 'Título atualizado' };

            const resultado = await service.update(10, dto, 1, 'Usuario');

            expect(resultado.titulo).toBe('Título atualizado');
        });

        it('deve atualizar quando o usuário é Administrador', async () => {
            mockConteudoRepository.buscarPorId.mockResolvedValue(mockConteudo as any);
            mockConteudoRepository.atualizar.mockResolvedValue(mockConteudo as any);

            const dto: UpdateConteudoDTO = { titulo: 'Novo título' };

            await service.update(10, dto, 999, 'Administrador');

            expect(mockConteudoRepository.atualizar).toHaveBeenCalled();
        });

        it('deve lançar erro de permissão', async () => {
            mockConteudoRepository.buscarPorId.mockResolvedValue(mockConteudo as any);

            await expect(
                service.update(10, { titulo: 'Teste' }, 999, 'Usuario')
            ).rejects.toThrow('Você não tem permissão para atualizar este conteúdo.');
        });
    });

    // ========================
    // DELETE
    // ========================
    describe('delete', () => {
        it('deve deletar quando o usuário é o autor', async () => {
            mockConteudoRepository.buscarParaPermissao.mockResolvedValue(mockConteudo as any);

            await service.delete(10, 1, 'Usuario');

            expect(mockConteudoRepository.deletar).toHaveBeenCalledWith(10);
        });

        it('deve deletar quando o usuário é Administrador', async () => {
            mockConteudoRepository.buscarParaPermissao.mockResolvedValue(mockConteudo as any);

            await service.delete(10, 999, 'Administrador');

            expect(mockConteudoRepository.deletar).toHaveBeenCalledWith(10);
        });

        it('deve lançar erro de permissão', async () => {
            mockConteudoRepository.buscarParaPermissao.mockResolvedValue(mockConteudo as any);

            await expect(service.delete(10, 999, 'Usuario'))
                .rejects.toThrow('Você não tem permissão para excluir este conteúdo.');
        });
    });
});