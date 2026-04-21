import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import { prisma } from "./lib/prisma.js";

const app = express();
const port = 3000;

// --- AJUSTE DE CAMINHOS PARA ES MODULES (Node moderno) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importante: Como o server.ts está em 'src/', subimos um nível para achar a 'public' na raiz do projeto
const publicPath = path.resolve(__dirname, "../public");
const uploadsPath = path.join(publicPath, "uploads");

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// 1. Serve todos os arquivos (HTML, CSS, JS) da pasta public automaticamente
app.use(express.static(publicPath));

// 2. Serve a pasta de fotos especificamente
app.use("/uploads", express.static(uploadsPath));

// --- CONFIGURAÇÃO DO MULTER (UPLOAD DE FOTOS) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Garante que a pasta de fotos existe antes de salvar
        if (!fs.existsSync(uploadsPath)) {
            fs.mkdirSync(uploadsPath, { recursive: true });
        }
        cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { files: 4 } });

// --- ROTAS DE API ---
// --- ENTIDADE: CATEGORIAS ---

app.get("/api/categories", async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: { subCategories: true },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar categorias" });
    }
});

app.post("/api/categories", async (req, res) => {
    try {
        const { name } = req.body;
        const category = await prisma.category.create({ data: { name: name.trim() } });
        res.status(201).json(category);
    } catch (error: any) {
        if (error.code === 'P2002') return res.status(400).json({ error: "Esta categoria já existe." });
        res.status(500).json({ error: "Erro ao criar categoria" });
    }
});

// Rota de Exclusão de Categoria
app.delete("/api/categories/:id", async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Remove subcategorias primeiro (Integridade Referencial)
        await prisma.subCategory.deleteMany({ where: { categoryId: id } });
        // 2. Remove a categoria
        await prisma.category.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao deletar categoria:", error);
        res.status(500).json({ error: "Erro ao excluir. Verifique se há produtos vinculados." });
    }
});

// --- SUBCATEGORIAS ---

app.get("/api/categories/:id/subcategories", async (req, res) => {
    try {
        const { id } = req.params;
        const subcategories = await prisma.subCategory.findMany({
            where: { categoryId: id },
            orderBy: { name: 'asc' }
        });
        
        // Retorna um array (vazio ou não), mas nunca 404 se a rota existe
        res.json(subcategories);
    } catch (error) {
        console.error("Erro ao buscar subcategorias:", error);
        res.status(500).json({ error: "Erro ao buscar subcategorias" });
    }
});


app.post("/api/subcategories", async (req, res) => {
    try {
        const { name, categoryId } = req.body;
        const sub = await prisma.subCategory.create({ data: { name: name.trim(), categoryId } });
        res.status(201).json(sub);
    } catch (e) {
        res.status(500).json({ error: "Erro ao criar subcategoria" });
    }
});

// --- PRODUTOS ---

app.get("/api/products", async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: { subCategory: { include: { category: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: "Erro ao buscar produtos" });
    }
});

// Rota de Exclusão de Produto
app.delete("/api/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Erro ao excluir produto" });
    }
});

app.post("/api/products", upload.array("photos", 4), async (req, res) => {
    try {
        const { name, description, price, stock, subCategoryId, brand, model, voltage } = req.body;
        const files = req.files as Express.Multer.File[];
        const imageUrls = files ? files.map(f => `/uploads/${f.filename}`) : [];

        const product = await prisma.product.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                stock: parseInt(stock),
                brand,
                model,
                voltage,
                subCategoryId,
                images: imageUrls,
            },
        });
        res.status(201).json(product);
    } catch (e) {
        res.status(500).json({ error: "Erro ao criar produto" });
    }
});

// --- ROTA DE FALLBACK (Para aceitar localhost:3000/admin sem o .html) ---
app.get("/admin", (req, res) => {
    res.sendFile(path.join(publicPath, "admin.html"));
});

// --- ROTA DE PEDIDOS (API ORDERS) ---
app.get("/api/orders", async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        // Retorna um array vazio para o dashboard não travar, mesmo se der erro
        res.json([]); 
    }
});

// --- INICIALIZAÇÃO ---
app.listen(port, () => {
    console.log(`\n🚀 Servidor Elétrica Moro pronto!`);
    console.log(`🔗 Link Principal: http://localhost:${port}`);
    console.log(`🔗 Link do Painel: http://localhost:${port}/admin.html\n`);
});