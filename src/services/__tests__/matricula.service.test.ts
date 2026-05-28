// src/services/__tests__/matricula.service.test.ts

import { MatriculaService } from '../matricula.services';
import { MatriculaRepository } from '../../repository/matricula.repository';
import { UsuarioRepository } from '../../repository/usuario.repository';

describe('MatriculaService', () => {
    let service: MatriculaService;
    let mockMatriculaRepository: jest.Mocked<MatriculaRepository>;
    let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;

    const mockUsuario = {
        id: 10,
        nomeCompleto: 'João Silva',
        perfil: 'Membro'
    };

    const mockSala = {
        id: 5,
        status: 'ativa',
        curso: { criadorUsuarioId: 3 }
    };

    const mockSalaDeOutroLider = {
        id: 7,
        status: 'ativa',
        curso: { criadorUsuarioId: 99 }
    };

    const mockParticipantes = [
        {
            usuario: {
                id: 10,
                nomeCompleto: 'João',
                perfil: 'Membro'
            },
            dataMatricula: new Date(),
            status: 'ativo' as const
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsuarioRepository = {
            buscarPorId: jest.fn(),
        } as unknown as jest.Mocked<UsuarioRepository>;

        mockMatriculaRepository = {
            matricular: jest.fn(),
            buscarMatricula: jest.fn(),
            salaExiste: jest.fn(),
            atualizarStatus: jest.fn(),
            removerParticipante: jest.fn(),
            listarParticipantes: jest.fn(),
            buscarHistoricoPorUsuario: jest.fn(),
        } as unknown as jest.Mocked<MatriculaRepository>;

        service = new MatriculaService(mockMatriculaRepository, mockUsuarioRepository);
    });

    // ========================
    // MATRICULAR
    // ========================
    describe('matricular', () => {
        // Você pode adicionar testes aqui depois
    });

    // ========================
    // LISTAR PARTICIPANTES
    // ========================
    describe('listarParticipantes', () => {
        it('deve listar participantes para qualquer usuário logado', async () => {
            mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);
            mockMatriculaRepository.listarParticipantes.mockResolvedValue(mockParticipantes as any);

            const resultado = await service.listarParticipantes(5);

            expect(resultado).toBeDefined();
            expect(resultado).toHaveLength(1);
            expect((resultado[0] as any).nomeCompleto).toBe('João');
            expect(mockMatriculaRepository.listarParticipantes).toHaveBeenCalledWith(5);
        });

        it('deve lançar erro se a sala não existir', async () => {
            mockMatriculaRepository.salaExiste.mockResolvedValue(null);

            await expect(service.listarParticipantes(999))
                .rejects.toThrow('Sala não encontrada');
        });
    });

    // ========================
    // REMOVER PARTICIPANTE
    // ========================
    describe('removerParticipante', () => {
        it('deve permitir Administrador remover participante', async () => {
            mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);

            await service.removerParticipante(5, 20, 999, 'Administrador');
            expect(mockMatriculaRepository.removerParticipante).toHaveBeenCalledWith(5, 20);
        });

        it('deve permitir Líder remover da sua própria sala', async () => {
            mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);

            await service.removerParticipante(5, 20, 3, 'Líder');
            expect(mockMatriculaRepository.removerParticipante).toHaveBeenCalledWith(5, 20);
        });

        it('deve bloquear Líder de remover em sala de outro líder', async () => {
            mockMatriculaRepository.salaExiste.mockResolvedValue(mockSalaDeOutroLider as any);

            await expect(service.removerParticipante(7, 20, 3, 'Líder'))
                .rejects.toThrow('Você não tem permissão para remover participantes');
        });
    });

    // ========================
    // CANCELAR MATRÍCULA
    // ========================
    describe('cancelarMatricula', () => {
        it('deve cancelar matrícula com sucesso', async () => {
            mockMatriculaRepository.buscarMatricula.mockResolvedValue({ status: 'ativo' } as any);

            await service.cancelarMatricula(5, 10);

            expect(mockMatriculaRepository.atualizarStatus).toHaveBeenCalledWith(
                5,
                10,
                'cancelado pelo usuario'
            );
        });
    });
});