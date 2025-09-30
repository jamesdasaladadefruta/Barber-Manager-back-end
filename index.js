// index.js
import express from "express";
import cors from "cors";
import pool from "./db.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.json());
app.use(cors());

// 🔹 Inicializa o banco de dados
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        senha VARCHAR(200) NOT NULL
      );
    `);
    console.log("✅ Tabela 'usuarios' verificada/criada com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao criar tabela:", err);
  }
}
initDB();

// ======================
// 📌 Rotas da API
// ======================
app.get("/api/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar usuários:", err);
    res.status(500).json({ erro: "Erro ao buscar usuários" });
  }
});

app.post("/api/usuarios", async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING *",
      [nome, email, senha]
    );
    res.status(201).json({
      mensagem: "Usuário criado com sucesso!",
      usuario: result.rows[0],
    });
  } catch (err) {
    console.error("Erro ao criar usuário:", err);
    res.status(500).json({ erro: "Erro ao criar usuário" });
  }
});

// ======================
// 📌 Servindo o React buildado
// ======================
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ======================
// 📌 Iniciar servidor
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
