import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { parseRouter } from './routes/parse.js';
import { sessionsRouter } from './routes/sessions.js';
import { userRouter } from './routes/user.js';
import { githubRouter } from './routes/github.js';
import { swaggerSpec } from './swagger.js';
import { optionalAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json({ limit: '50mb' }));
app.use(optionalAuth);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.use('/api', parseRouter);
app.use('/api', sessionsRouter);
app.use('/api', userRouter);
app.use('/api', githubRouter);

// Global error handler — catches unhandled errors from middleware (e.g. multer)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`InfraGraph backend running on http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/docs`);
});
