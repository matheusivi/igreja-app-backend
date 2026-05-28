// src/controllers/matricula.controller.ts

import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { MatriculaService } from '../services/matricula.services';
import { AppError } from '../utils/AppError';
import {
    SalaIdParamSchema,
    UsuarioIdParamSchema,
    AtualizarStatusSchema,
} from '../validation/matricula.validation';

export class MatriculaController {
    private matriculaService: MatriculaService;

    constructor() {
        this.matriculaService = new MatriculaService();
    }

    public matricular = async (req: AuthRequest, res: Response): Promise<void> => {
        const salaId = SalaIdParamSchema.parse(Number(req.params.salaId));
        const usuarioId = req.user!.id;

        const matricula = await this.matriculaService.matricular(salaId, usuarioId);

        res.status(201).json({
            success: true,
            message: 'Matrícula realizada com sucesso!',
            data: matricula,
        });
    };

    public cancelar = async (req: AuthRequest, res: Response): Promise<void> => {
        const salaId = SalaIdParamSchema.parse(Number(req.params.salaId));
        const usuarioId = req.user!.id;

        await this.matriculaService.cancelarMatricula(salaId, usuarioId);

        res.status(200).json({
            success: true,
            message: 'Matrícula cancelada com sucesso.',
        });
    };

    public listarParticipantes = async (req: AuthRequest, res: Response): Promise<void> => {
        const salaId = SalaIdParamSchema.parse(Number(req.params.salaId));

        const participantes = await this.matriculaService.listarParticipantes(
            salaId,
        );

        res.status(200).json({
            success: true,
            count: participantes.length,
            data: participantes,
        });
    };

    public removerParticipante = async (req: AuthRequest, res: Response): Promise<void> => {
        const salaId = SalaIdParamSchema.parse(Number(req.params.salaId));
        const usuarioId = UsuarioIdParamSchema.parse(Number(req.params.usuarioId));

        await this.matriculaService.removerParticipante(
            salaId,
            usuarioId,
            req.user!.id,
            req.user!.perfil
        );

        res.status(200).json({
            success: true,
            message: 'Participante removido da sala com sucesso.',
        });
    };

    public atualizarStatusParticipante = async (req: AuthRequest, res: Response): Promise<void> => {
        const salaId = SalaIdParamSchema.parse(Number(req.params.salaId));
        const usuarioId = UsuarioIdParamSchema.parse(Number(req.params.usuarioId));

        const { status } = AtualizarStatusSchema.parse(req.body);

        await this.matriculaService.atualizarStatusParticipante(
            salaId,
            usuarioId,
            status,
            req.user!.id,
            req.user!.perfil
        );

        res.status(200).json({
            success: true,
            message: `Participante marcado como '${status}' com sucesso.`,
        });
    };

    public meuHistorico = async (req: AuthRequest, res: Response): Promise<void> => {
        const usuarioId = req.user!.id;

        const historico = await this.matriculaService.buscarHistorico(usuarioId);

        res.status(200).json({
            success: true,
            count: historico.length,
            data: historico,
        });
    };
}