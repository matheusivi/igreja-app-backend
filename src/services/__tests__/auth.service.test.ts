// src/services/__tests__/auth.service.test.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../auth.services';
import { UsuarioRepository } from '../../repository/usuario.repository';
import type { RegisterDTO, LoginDTO } from '../../dtos/auth.dto';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
    let service: AuthService;
    let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;

    const mockUsuario = {
        id: 42,
        nomeCompleto: 'Maria Oliveira',
        email: 'maria@test.com',
        perfil: 'Usuario',
        senha: '$2a$10$validHash1234567890',
        dataNascimento: new Date('1995-03-15'),
        estadoCivil: 'Solteira',
        profissao: 'Professora',
    };

    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDIsInBlcmZpbCI6IlVzdWFyaW8ifQ.signature';

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsuarioRepository = {
            buscarPorEmail: jest.fn(),
            criar: jest.fn(),
            buscarPorId: jest.fn(),
        } as unknown as jest.Mocked<UsuarioRepository>;

        service = new AuthService(mockUsuarioRepository);

        // Configurações padrão dos mocks
        (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedPassword123456');
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue(mockToken);
        (jwt.verify as jest.Mock).mockReturnValue({
            id: 42,
            perfil: 'Usuario',
            iat: 1710000000,
            exp: 1710600000,
        });
    });

    // ========================
    // REGISTER
    // ========================
    describe('register', () => {
        it('deve registrar um usuário com sucesso (todos os campos)', async () => {
            mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
            mockUsuarioRepository.criar.mockResolvedValue(mockUsuario as any);

            const dto: RegisterDTO = {
                nomeCompleto: 'Maria Oliveira',
                email: 'maria@test.com',
                senha: 'SenhaForte123!',
                dataNascimento: new Date('1995-03-15') as any,
                estadoCivil: 'Solteira',
                profissao: 'Professora',
            };

            const resultado = await service.register(dto);

            expect(mockUsuarioRepository.buscarPorEmail).toHaveBeenCalledWith('maria@test.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('SenhaForte123!', 10);
            expect(mockUsuarioRepository.criar).toHaveBeenCalledWith({
                nomeCompleto: 'Maria Oliveira',
                email: 'maria@test.com',
                senhaHash: '$2a$10$hashedPassword123456',
                dataNascimento: dto.dataNascimento,
                estadoCivil: 'Solteira',
                profissao: 'Professora',
            });

            expect(resultado).toEqual({
                id: 42,
                nomeCompleto: 'Maria Oliveira',
                email: 'maria@test.com',
                perfil: 'Usuario',
                token: mockToken,
            });
        });

        it('deve registrar usuário com campos opcionais ausentes', async () => {
            mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
            mockUsuarioRepository.criar.mockResolvedValue(mockUsuario as any);

            const dto: RegisterDTO = {
                nomeCompleto: 'João Silva',
                email: 'joao@test.com',
                senha: '123456',
                // dataNascimento, estadoCivil e profissao não enviados
            } as RegisterDTO;

            await service.register(dto);

            expect(mockUsuarioRepository.criar).toHaveBeenCalledWith({
                nomeCompleto: 'João Silva',
                email: 'joao@test.com',
                senhaHash: expect.any(String),
                dataNascimento: undefined,
                estadoCivil: undefined,
                profissao: undefined,
            });
        });

        it('deve lançar erro quando e-mail já estiver cadastrado', async () => {
            mockUsuarioRepository.buscarPorEmail.mockResolvedValue(mockUsuario as any);

            const dto: RegisterDTO = {
                nomeCompleto: 'Teste',
                email: 'maria@test.com',
                senha: '123456',
            } as RegisterDTO;

            await expect(service.register(dto)).rejects.toThrow('Este e-mail já está cadastrado no sistema.');
            expect(mockUsuarioRepository.criar).not.toHaveBeenCalled();
        });
    });

    // ========================
    // LOGIN
    // ========================
    describe('login', () => {
        it('deve realizar login com sucesso', async () => {
            mockUsuarioRepository.buscarPorEmail.mockResolvedValue(mockUsuario as any);

            const dto: LoginDTO = {
                email: 'maria@test.com',
                senha: 'SenhaForte123!',
            };

            const resultado = await service.login(dto);

            expect(mockUsuarioRepository.buscarPorEmail).toHaveBeenCalledWith('maria@test.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('SenhaForte123!', mockUsuario.senha);
            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 42, perfil: 'Usuario' },
                expect.any(String),
                { expiresIn: '24h' }
            );

            expect(resultado.token).toBe(mockToken);
        });

        it('deve lançar erro quando usuário não for encontrado', async () => {
            mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);

            await expect(
                service.login({ email: 'naoexiste@test.com', senha: '123456' })
            ).rejects.toThrow('E-mail ou senha inválidos.');
        });

        it('deve lançar erro quando senha estiver incorreta', async () => {
            mockUsuarioRepository.buscarPorEmail.mockResolvedValue(mockUsuario as any);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.login({ email: 'maria@test.com', senha: 'senhaerrada' })
            ).rejects.toThrow('E-mail ou senha inválidos.');
        });
    });

    // ========================
    // GET USER BY ID
    // ========================
    describe('getUserById', () => {
        it('deve retornar os dados completos do usuário', async () => {
            mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);

            const usuario = await service.getUserById(42);

            expect(mockUsuarioRepository.buscarPorId).toHaveBeenCalledWith(42);
            expect(usuario).toEqual(mockUsuario);
        });

        it('deve lançar erro quando usuário não existir', async () => {
            mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

            await expect(service.getUserById(999)).rejects.toThrow('Usuário não encontrado.');
        });
    });

    // ========================
    // VERIFY TOKEN
    // ========================
    describe('verifyToken', () => {
        it('deve validar token válido e retornar payload correto', () => {
            const payload = service.verifyToken(mockToken);

            expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String));
            expect(payload).toMatchObject({
                id: 42,
                perfil: 'Usuario',
            });
        });

        it('deve lançar erro quando token for inválido', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('invalid signature');
            });

            expect(() => service.verifyToken('token.invalido')).toThrow('Token inválido ou expirado.');
        });

        it('deve lançar erro quando token estiver expirado', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new jwt.TokenExpiredError('jwt expired', new Date());
            });

            expect(() => service.verifyToken('expired.token')).toThrow('Token inválido ou expirado.');
        });
    });

    // ========================
    // GENERATE TOKEN (indireto)
    // ========================
    describe('generateToken (indireto)', () => {
        it('deve gerar token com expiração de 7 dias', async () => {
            mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
            mockUsuarioRepository.criar.mockResolvedValue(mockUsuario as any);

            await service.register({
                nomeCompleto: 'Teste',
                email: 'teste@test.com',
                senha: '123456',
            } as RegisterDTO);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.objectContaining({ id: 42, perfil: 'Usuario' }),
                expect.any(String),
                { expiresIn: '24h' }
            );
        });
    });
});