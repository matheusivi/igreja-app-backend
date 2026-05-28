
import { prisma } from '../lib/prisma';

export class MatriculaRepository {

    async matricular(salaId: number, usuarioId: number) {
        return prisma.usuarioSala.create({
            data: {
                salaId,
                usuarioId,
                status: 'ativo',
            },
            include: {
                sala: {
                    select: {
                        id: true,
                        nomeSala: true,
                        curso: {
                            select: {
                                id: true,
                                nome: true,
                            }
                        }
                    }
                }
            }
        });
    }

    async buscarMatricula(salaId: number, usuarioId: number) {
        return prisma.usuarioSala.findUnique({
            where: {
                salaId_usuarioId: { salaId, usuarioId },
            },
            include: {
                sala: {
                    select: {
                        nomeSala: true,
                        curso: {
                            select: {
                                nome: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async salaExiste(salaId: number) {
        return prisma.salaCurso.findUnique({
            where: { id: salaId },
            select: {
                id: true,
                status: true,
                curso: {
                    select: {
                        criadorUsuarioId: true,
                    },
                },
            },
        });
    }

    async atualizarStatus(salaId: number, usuarioId: number, status: string) {
        return prisma.usuarioSala.update({
            where: {
                salaId_usuarioId: { salaId, usuarioId },
            },
            data: { status },
        });
    }

    async removerParticipante(salaId: number, usuarioId: number) {
        return prisma.usuarioSala.delete({
            where: {
                salaId_usuarioId: { salaId, usuarioId },
            },
        });
    }

    async listarParticipantes(salaId: number) {
        return prisma.usuarioSala.findMany({
            where: { salaId },
            include: {
                usuario: {
                    select: {
                        id: true,
                        nomeCompleto: true,
                        perfil: true,
                    }
                }
            },
            orderBy: {
                dataMatricula: 'desc',
            }
        });
    }

    async buscarHistoricoPorUsuario(usuarioId: number) {
        return prisma.usuarioSala.findMany({
            where: { usuarioId },
            include: {
                sala: {
                    include: {
                        curso: {
                            select: {
                                id: true,
                                nome: true,
                                categoria: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                dataMatricula: "desc",
            },
        });
    }
}