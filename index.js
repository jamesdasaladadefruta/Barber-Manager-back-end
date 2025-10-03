import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
const { Pool } = require('pg');

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wiM5J1BPFjUA@ep-wandering-cake-acp8ynxp-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' , 
  ssl: {
    rejectUnauthorized: false
  }
});

dotenv.config(); 

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8081;

// Criar tabela de usuários se não existir
const createUsersTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tabela 'users' criada ou já existente!");
  } catch (err) {
    console.error("Erro ao criar tabela:", err);
  }
};

// Rota de teste
app.get('/', (req, res) => {
  res.send('Servidor rodando!');
});

// Adicionar usuário
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar usuário' });
  }
});

// Listar usuários
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
  await createUsersTable();
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
