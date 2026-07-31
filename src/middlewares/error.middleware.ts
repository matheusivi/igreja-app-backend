import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "../lib/logger"; // adicionar

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Erro interno do servidor";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Dados inválidos";

    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    // Sai no log com o campo que reprovou. Antes o terminal só mostrava
    // "POST /api/salas/12 400" e não havia como saber o que estava errado.
    logger.warn(
      { method: req.method, url: req.url, statusCode, errors },
      "Validação falhou",
    );

    res.status(400).json({
      success: false,
      message,
      errors,
    });
    return;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      message = "Registro duplicado. Este dado já existe.";
    } else if (err.code === "P2025") {
      statusCode = 404;
      message = "Registro não encontrado.";
    }
  }

  if (statusCode >= 500) {
    logger.error(
      {
        err,
        method: req.method,
        url: req.url,
        statusCode,
      },
      message,
    );
  } else {
    logger.warn({
      method: req.method,
      url: req.url,
      statusCode,
      message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && process.env.NODE_ENV === "production"
        ? "Erro interno do servidor"
        : message,
  });
};
