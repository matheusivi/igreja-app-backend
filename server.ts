// server.ts (na raiz do projeto)
import dotenv from 'dotenv';
dotenv.config();   // Primeira linha

import express from 'express';
import cors from 'cors';

import { authRoutes } from './src/routes/auth.routes';
import { conteudoRoutes } from './src/routes/conteudo.routes';
import { cursoRoutes } from './src/routes/curso.routes';
import { salaRoutes } from './src/routes/sala.routes';
// import { usuarioRoutes } from './src/routes/usuario.routes.js';
// import { visitanteRoutes } from './src/routes/visitante.routes';

const app = express();
const PORT = process.env.PORT || 3000;


// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/conteudos', conteudoRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/salas', salaRoutes);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Erro global
app.use((err: any, req: express.Request, res: express.Response) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

export default app;