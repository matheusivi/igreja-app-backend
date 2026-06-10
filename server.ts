
import './src/config/env';
import express from 'express';
import cors from 'cors';
import { env } from './src/config/env';
import { authLimiter, generalLimiter } from './src/middlewares/rateLimiter';
import helmet from 'helmet';

import { authRoutes } from './src/routes/auth.routes';
import { conteudoRoutes } from './src/routes/conteudo.routes';
import { cursoRoutes } from './src/routes/curso.routes';
import { salaRoutes } from './src/routes/sala.routes';
import { matriculaRoutes } from './src/routes/matricula.routes';
import { pedidoOracaoRoutes } from './src/routes/pedidoOracao.routes';
import { grupoFamiliarRoutes } from './src/routes/grupoFamiliar.routes';

import { errorHandler } from './src/middlewares/error.middleware';

const app = express();
const PORT = env.PORT || 3000;
app.use(helmet())

// ======================
// Middlewares Globais
// ======================
app.use(cors({
  origin: env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'], // ajuste conforme seu frontend
  credentials: true,
}));

app.use(generalLimiter);
app.use(express.json({ limit: env.PAYLOAD_SIZE }));
app.use(express.urlencoded({ limit: env.PAYLOAD_SIZE, extended: true }));

// ======================
// Rotas da API
// ======================

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/conteudos', conteudoRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/salas', salaRoutes);
app.use('/api/matriculas', matriculaRoutes);
app.use('/api/pedido-oracao', pedidoOracaoRoutes);
app.use('/api/familias', grupoFamiliarRoutes);

// ======================
// Rotas Básicas
// ======================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ======================
// Middleware 404
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// ======================
// Middleware Global de Erros
// ======================
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

export default app;