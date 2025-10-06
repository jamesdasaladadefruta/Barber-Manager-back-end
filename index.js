// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

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

/* ===========================================================
   🔹 CRIAR TABELAS + ADMIN PADRÃO
=========================================================== */
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        servicos JSONB NOT NULL,
        total NUMERIC(10,2) NOT NULL,
        data DATE NOT NULL,
        horario TIME NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar admin padrão
    const adminExists = await pool.query(
      "SELECT * FROM users WHERE email = 'admin@admin'"
    );
    if (adminExists.rows.length === 0) {
      const hash = bcrypt.hashSync('admin', 10);
      await pool.query(
        'INSERT INTO users (name, email, senha, role) VALUES ($1, $2, $3, $4)',
        ['Administrador', 'admin@admin', hash, 'admin']
      );
      console.log("👑 Admin criado (admin@admin / senha: admin)");
    }

    console.log("✅ Tabelas criadas/verificadas!");
  } catch (err) {
    console.error("❌ Erro ao criar tabelas:", err);
  }
};

/* ===========================================================
   🔹 ROTA DE TESTE
=========================================================== */
app.get('/', (req, res) => {
  res.send('🚀 Servidor Barber Manager rodando!');
});

/* ===========================================================
   🔹 ROTAS DE USUÁRIOS
=========================================================== */

// Cadastro
app.post('/users', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });

  try {
    const senhaHash = bcrypt.hashSync(senha, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, senha, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [nome, email, senhaHash, 'user']
    );
    res.status(201).json({ message: 'Usuário cadastrado!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'E-mail já cadastrado' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário', details: err.message });
  }
});

// Listar usuários
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });

    const user = result.rows[0];
    const senhaCorreta = bcrypt.compareSync(senha, user.senha);
    if (!senhaCorreta) return res.status(401).json({ error: 'Senha incorreta' });

    res.json({
      message: 'Login realizado com sucesso!',
      role: user.role,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro no servidor', details: err.message });
  }
});

/* ===========================================================
   🔹 ROTAS DE PEDIDOS
=========================================================== */

// Criar pedido
app.post('/api/pedidos', async (req, res) => {
  const { servicos, total, data, horario } = req.body;
  if (!servicos || !total || !data || !horario) return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });

  try {
    // Verifica se horário já está ocupado
    const exists = await pool.query('SELECT * FROM pedidos WHERE data = $1 AND horario = $2', [data, horario]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'Horário já ocupado.' });

    const result = await pool.query(
      'INSERT INTO pedidos (servicos, total, data, horario) VALUES ($1, $2, $3, $4) RETURNING *',
      [servicos, total, data, horario]
    );
    res.status(201).json({ message: 'Pedido salvo com sucesso!', pedido: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar pedido', details: err.message });
  }
});

// Listar pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pedidos', details: err.message });
  }
});

/* ===========================================================
   🔹 INICIAR SERVIDOR
=========================================================== */
app.listen(PORT, async () => {
  await createTables();
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});
