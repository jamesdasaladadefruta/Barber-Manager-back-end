import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_wiM5J1BPFjUA@ep-wandering-cake-acp8ynxp-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});

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
        senha VARCHAR(100) NOT NULL,
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

// Adicionar usuário (Cadastro)
app.post('/users', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, senha) VALUES ($1, $2, $3) RETURNING *',
      [nome, email, senha]
    );
    res.status(201).json({ message: 'Usuário cadastrado!', user: result.rows[0] });
  } catch (err) {
    console.error('Erro ao adicionar usuário:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao adicionar usuário', details: err.message });
  }
});

// Listar usuários
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE email = $1 AND senha = $2',
      [email, senha]
    );

    if (result.rows.length > 0) {
      res.json({ message: 'Login realizado!', user: result.rows[0] });
    } else {
      res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro no servidor', details: err.message });
  }
});
app.post("/api/pedidos", (req, res) => {
  const { servicos, total, data } = req.body;
  console.log("Novo pedido recebido:", servicos, total, data);

  // Aqui você pode salvar no banco
  res.json({ message: "Pedido recebido com sucesso!" });
});




// Iniciar servidor
app.listen(PORT, async () => {
  await createUsersTable();
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

