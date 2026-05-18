import app from './app';
import pool from './db/index';

const PORT = process.env.PORT || 5000;

pool.query('SELECT NOW()', (err, _res) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
  } else {
    console.log('Successfully connected to the PostgreSQL database!');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
