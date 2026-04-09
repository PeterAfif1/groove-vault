import express, { type Request, type Response } from 'express';
import cors from 'cors';
import pool from './db/index';
import rudimentRoutes from './routes/rudimentRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/rudiments', rudimentRoutes);

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
  } else {
    console.log('Successfully connected to the PostgreSQL database!');
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Groove Vault Engine is running perfectly.');
});

app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Hello from TypeScript Express backend!" });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
