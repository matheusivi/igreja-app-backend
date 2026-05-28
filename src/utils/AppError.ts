export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean = true;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;

        // Necessário para TypeScript
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

//Revisão minha.
// 1. Super: Chama o construtor da classe pai (Error) com a mensagem
// 2. Status Code: Define o status HTTP (400, 401, 403, 404, 500)
// 3. Is Operational: Indica que é um erro esperado (não bug de programação)
// 4. Capture Stack Trace: Garante que o erro tenha um formato limpo no log