import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.services';
import type { TokenPayload } from '../services/auth.services';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        perfil: string;
    };
}

export class AuthMiddleware {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    /**
     * Verifica se o usuário está autenticado via JWT
     */
    public authenticate = async (
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    message: 'Token não fornecido. Use o formato: Bearer <token>'
                });
                return;
            }

            const token = authHeader.split(' ')[1];

            if (!token) {
                res.status(401).json({
                    success: false,
                    message: 'Token mal formatado. Use o formato: Bearer <token>'
                });
                return;
            }

            const decoded: TokenPayload = this.authService.verifyToken(token);

            req.user = {
                id: decoded.id,
                perfil: decoded.perfil,
            };

            next();
        } catch (error: any) {
            res.status(401).json({
                success: false,
                message: error.message || 'Token inválido ou expirado.'
            });
        }
    };

    /**
     * Verifica se o usuário possui pelo menos um dos perfis permitidos
     * Exemplo: requireRole(['Pastor', 'Líder', 'Administrador'])
     */
    public requireRole = (allowedRoles: string[], customMessage?: string) => {
        return (req: AuthRequest, res: Response, next: NextFunction): void => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Usuário não autenticado.'
                });
                return;
            }

            const hasPermission = allowedRoles.includes(req.user.perfil);

            if (!hasPermission) {
                res.status(403).json({
                    success: false,
                    message: customMessage || `Acesso negado. Perfis permitidos: ${allowedRoles.join(', ')}`,
                    seuPerfil: req.user.perfil,
                    perfisPermitidos: allowedRoles
                });
                return;
            }

            next();
        };
    };
}


export const authMiddleware = new AuthMiddleware();