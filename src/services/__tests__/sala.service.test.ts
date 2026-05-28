// src/services/__tests__/sala.service.test.ts

import { SalaService } from '../sala.services';
import { UsuarioRepository } from '../../repository/usuario.repository';
import { SalaCursoRepository } from '../../repository/salaCurso.repository';
import type { CreateSalaDTO, UpdateSalaDTO, ListSalasQuery } from '../../dtos/sala.dto';

describe('SalaService', () => {
    let service: SalaService;
    let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
    let mockSalaCursoRepository: jest.Mocked<SalaCursoRepository>;

    const mockCursoComCriador = {
        id: 10,
        nome: 'Curso de Teologia',
        criador: {
            id: 5,
            nomeCompleto: 'Pastor João',
            perfil: 'Pastor',
        },
    };

    const mockSala = {
        id: 100,
        nomeSala: 'Sala A - Turma 2026',
        dataInicio: new Date('2026-02-01'),
        dataFim: new Date('2026-06-30'),
        status: 'ativa',
        curso: mockCursoComCriador,
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsuarioRepository = {
            buscarPorId: jest.fn(),
        } as unknown as jest.Mocked<UsuarioRepository>;

        mockSalaCursoRepository = {
            cursoExiste: jest.fn(),
            criar: jest.fn(),
            buscarPorId: jest.fn(),
            listar: jest.fn(),
            buscarParaPermissao: jest.fn(),
            atualizar: jest.fn(),
            deletar: jest.fn(),
        } as unknown as jest.Mocked<SalaCursoRepository>;

        service = new SalaService(mockUsuarioRepository, mockSalaCursoRepository);
    });

    // ========================
    // CREATE
    // ========================
    describe('create', () => {
        it('deve criar sala com sucesso', async () => {
            mockUsuarioRepository.buscarPorId.mockResolvedValue({ id: 1 } as any);
            mockSalaCursoRepository.cursoExiste.mockResolvedValue({ id: 10 } as any);
            mockSalaCursoRepository.criar.mockResolvedValue(mockSala as any);

            const dto: CreateSalaDTO = {
                cursoId: 10,
                nomeSala: 'Sala A - Turma 2026',
            };

            const resultado = await service.create(dto, 1);
            expect(resultado).toBeDefined();
            expect(resultado.nomeSala).toBe('Sala A - Turma 2026');
        });

        it('deve criar sala com dataInicio e dataFim nulos', async () => {
            mockUsuarioRepository.buscarPorId.mockResolvedValue({ id: 1 } as any);
            mockSalaCursoRepository.cursoExiste.mockResolvedValue(mockCursoComCriador as any);
            mockSalaCursoRepository.criar.mockResolvedValue(mockSala as any);

            const dto: CreateSalaDTO = {
                cursoId: 10,
                nomeSala: 'Sala sem data',
            };

            await service.create(dto, 1);

            expect(mockSalaCursoRepository.criar).toHaveBeenCalledWith(
                expect.objectContaining({
                    dataInicio: null,
                    dataFim: null,
                })
            );
        });
    });

    // ========================
    // GET BY ID
    // ========================
    describe('getById', () => {
        it('deve retornar sala quando encontrada', async () => {
            mockSalaCursoRepository.buscarPorId.mockResolvedValue(mockSala as any);

            const resultado = await service.getById(100);
            expect(resultado.id).toBe(100);
        });
    });

    // ========================
    // LIST
    // ========================
    describe('list', () => {
        it('deve listar salas com filtros padrão', async () => {
            mockSalaCursoRepository.listar.mockResolvedValue([mockSala] as any);

            const resultado = await service.list();

            expect(mockSalaCursoRepository.listar).toHaveBeenCalledWith({
                orderBy: { id: 'desc' },
                take: 20,
                skip: 0,
            });

            expect(resultado).toHaveLength(1);
        });

        it('deve retornar array vazio quando não encontrar salas', async () => {
            mockSalaCursoRepository.listar.mockResolvedValue([]);

            const resultado = await service.list();
            expect(resultado).toEqual([]);
        });
    });

    // ========================
    // UPDATE
    // ========================
    describe('update', () => {
        it('deve atualizar quando tem permissão', async () => {
            mockSalaCursoRepository.buscarParaPermissao.mockResolvedValue({
                curso: { criadorUsuarioId: 5 }
            } as any);
            mockSalaCursoRepository.atualizar.mockResolvedValue(mockSala as any);

            const resultado = await service.update(100, { nomeSala: 'Nova Sala' }, 5, 'Usuario');

            expect(resultado).toBeDefined();
        });
    });

    // ========================
    // DELETE
    // ========================
    describe('delete', () => {
        it('deve deletar quando tem permissão', async () => {
            mockSalaCursoRepository.buscarParaPermissao.mockResolvedValue({
                curso: { criadorUsuarioId: 5 }
            } as any);

            await service.delete(100, 5, 'Usuario');
            expect(mockSalaCursoRepository.deletar).toHaveBeenCalledWith(100);
        });
    });
});