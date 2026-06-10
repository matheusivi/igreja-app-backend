// src/middlewares/error.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    let statusCode = 500;
    let message = 'Erro interno do servidor';

    // Erros controlados pela aplicação
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // Erros de validação do Zod
    else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Dados inválidos';

        res.status(400).json({
            success: false,
            message,
            errors: err.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
        return;
    }
    // Erros de conexão com o banco de dados
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            statusCode = 409;
            message = 'Registro duplicado. Este dado já existe.';
        } else if (err.code === 'P2025') {
            statusCode = 404;
            message = 'Registro não encontrado.';
        }
    }
    // Log detalhado apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        console.error(`[${new Date().toISOString()}] Erro não tratado:`, err);
    } else {
        console.error(`Erro não tratado: ${err.message || err}`);
    }

    // Nunca expor detalhes técnicos em produção
    res.status(statusCode).json({
        success: false,
        message,
    });
};