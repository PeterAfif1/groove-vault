import express, { type Request, type Response } from 'express';
import cors from 'cors';
import rudimentRoutes from './routes/rudimentRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/rudiments', rudimentRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Groove Vault Engine is running perfectly.');
});

app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Hello from TypeScript Express backend!' });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
