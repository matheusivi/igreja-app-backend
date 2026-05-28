import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,     // 15 minutos
    max: 10,                      // máximo 10 tentativas por IP
    message: {
        success: false,
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const generalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,      // 1 minuto
    max: 60,                      // 60 requisições por minuto
    message: {
        success: false,
        message: 'Muitas requisições. Aguarde um momento.'
    }
});