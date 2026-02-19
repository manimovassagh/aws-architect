import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { parseRouter } from './routes/parse.js';
import { swaggerSpec } from './swagger.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json({ limit: '50mb' }));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.use('/api', parseRouter);

app.listen(PORT, () => {
  console.log(`AWSArchitect backend running on http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/docs`);
});
