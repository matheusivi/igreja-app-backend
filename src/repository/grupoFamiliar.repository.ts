import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const includeMembros = {
    membros: {
        include: {
            usuario: {
                select: {
                    id: true,
                    nomeCompleto: true,
                    perfil: true,
                    fotoUrl: true,
                },
            },
            convidadoPor: {
                select: {
                    id: true,
                    nomeCompleto: true,
                },
            },
        },
    },
} satisfies Prisma.GrupoFamiliarInclude;

export class GrupoFamiliarRepository {
    async criar(data: Prisma.GrupoFamiliarCreateInput) {
        return prisma.grupoFamiliar.create({
            data,
            include: includeMembros,
        });
    }

    async buscarPorId(id: number) {
        return prisma.grupoFamiliar.findUnique({
            where: { id },
            include: includeMembros,
        });
    }

    async atualizar(id: number, data: Prisma.GrupoFamiliarUpdateInput) {
        return prisma.grupoFamiliar.update({
            where: { id },
            data,
            include: includeMembros,
        });
    }

   async buscarPorUsuario(usuarioId: number, skip: number = 0, take: number = 20) {
  return prisma.grupoFamiliar.findMany({
    where: {
      membros: {
        some: {
          usuarioId,
          status: 'aceito',
        },
      },
    },
    include: includeMembros,
    skip,
    take,
  });
}

    async buscarMembroPorId(id: number): Promise<{
        id: number;
        usuarioId: number;
        grupoFamiliarId: number;
        status: string;
    } | null> {
        return prisma.membroFamilia.findUnique({
            where: { id },
            select: {
                id: true,
                usuarioId: true,
                grupoFamiliarId: true,
                status: true,
            },
        });
    }

    async buscarMembroPorUsuarioEGrupo(usuarioId: number, grupoFamiliarId: number) {
        return prisma.membroFamilia.findUnique({
            where: {
                usuarioId_grupoFamiliarId: { usuarioId, grupoFamiliarId },
            },
        });
    }

    async criarConvite(data: Prisma.MembroFamiliaCreateInput) {
        return prisma.membroFamilia.create({ data });
    }

    async atualizarStatusConvite(id: number, status: string) {
        return prisma.membroFamilia.update({
            where: { id },
            data: { status },
        });
    }

    async buscarConvitesPendentes(usuarioId: number) {
        return prisma.membroFamilia.findMany({
            where: { usuarioId, status: 'pendente' },
            include: {
                grupoFamiliar: { select: { id: true, nome: true } },
                convidadoPor: { select: { id: true, nomeCompleto: true } },
            },
        });
    }

    async contarPorUsuario(usuarioId: number): Promise<number> {
  return prisma.grupoFamiliar.count({
    where: {
      membros: {
        some: {
          usuarioId,
          status: 'aceito',
        },
      },
    },
  });
}



  
    async removerMembro(usuarioId: number, grupoFamiliarId: number) {
        return prisma.membroFamilia.delete({
            where: {
                usuarioId_grupoFamiliarId: { usuarioId, grupoFamiliarId },
            },
        });
    }

    async contarMembrosAtivos(grupoFamiliarId: number): Promise<number> {
        return prisma.membroFamilia.count({
            where: {
                grupoFamiliarId,
                status: 'aceito',
            },
        });
    }

    async deletarGrupo(id: number) {
        return prisma.grupoFamiliar.delete({
            where: { id },
  });
}
}