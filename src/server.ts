import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma.js";

const app = express();
const port = 3000;

// --- AJUSTE DE CAMINHOS PARA ES MODULES ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "../public");
const uploadsPath = path.join(publicPath, "uploads");

// --- MIDDLEWARES DE SEGURANÇA E PERFORMANCE ---
app.use(helmet({ contentSecurityPolicy: false })); // Permite carregar scripts externos como Tailwind/Phosphor
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Muitas requisições, tente novamente mais tarde."
});
app.use("/api/", limiter);

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

// --- CONFIGURAÇÃO DO MULTER (UPLOAD DE FOTOS) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
        cb(null, uploadsPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- ROTAS DE CATEGORIAS E SUBCATEGORIAS ---

// GET: Lista categorias incluindo suas subcategorias (Vital para o frontend)
app.get("/api/categories", async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: { subCategories: true }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar categorias" });
    }
});

app.post("/api/categories", upload.single("photo"), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório" });
        const file = req.file as Express.Multer.File | undefined;
        const imageUrl = file ? `/uploads/${file.filename}` : null;
        const category = await prisma.category.create({ data: { name: name.trim(), imageUrl } });
        res.status(201).json(category);
    } catch (e: any) {
        if (e?.code === "P2002") return res.status(409).json({ error: "Categoria já existe" });
        res.status(500).json({ error: "Erro ao criar categoria" });
    }
});

app.delete("/api/categories/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({ where: { id } });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: "Erro ao deletar categoria" });
    }
});

app.put("/api/categories/:id", upload.single("photo"), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório" });
        const data: any = { name: name.trim() };
        const file = req.file as Express.Multer.File | undefined;
        if (file) data.imageUrl = `/uploads/${file.filename}`;
        const category = await prisma.category.update({ where: { id }, data });
        res.json(category);
    } catch (e: any) {
        if (e?.code === "P2025") return res.status(404).json({ error: "Categoria não encontrada" });
        if (e?.code === "P2002") return res.status(409).json({ error: "Já existe uma categoria com esse nome" });
        res.status(500).json({ error: "Erro ao atualizar categoria" });
    }
});

app.delete("/api/subcategories/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.subCategory.delete({ where: { id } });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: "Erro ao deletar subcategoria" });
    }
});

// GET: Subcategorias de uma categoria específica (usado pelo select de produto)
app.get("/api/categories/:id/subcategories", async (req, res) => {
    try {
        const { id } = req.params;
        const subs = await prisma.subCategory.findMany({ where: { categoryId: id } });
        res.json(subs);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar subcategorias" });
    }
});

// GET: Lista todas as subcategorias
app.get("/api/subcategories", async (req, res) => {
    try {
        const subs = await prisma.subCategory.findMany();
        res.json(subs);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar subcategorias" });
    }
});

app.post("/api/subcategories", async (req, res) => {
    try {
        const { name, categoryId } = req.body;
        const subCategory = await prisma.subCategory.create({
            data: { name, categoryId }
        });
        res.status(201).json(subCategory);
    } catch (e) {
        res.status(500).json({ error: "Erro ao criar subcategoria" });
    }
});

// --- ROTAS DE PRODUTOS ---

app.get("/api/products", async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar produtos" });
    }
});

app.post("/api/products", upload.array("photos", 5), async (req, res) => {
    try {
        const { name, description, price, stock, brand, model, voltage, subCategoryId } = req.body;
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
        console.error(e);
        res.status(500).json({ error: "Erro ao criar produto" });
    }
});

app.put("/api/products/:id", upload.array("photos", 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, brand, model, voltage, subCategoryId, on_sale, is_featured } = req.body;
        const files = req.files as Express.Multer.File[];

        const data: any = {
            name, description, brand, model, voltage,
            price: parseFloat(price),
            stock: parseInt(stock),
            subCategoryId: subCategoryId || null,
            on_sale: on_sale === "true" || on_sale === true,
            is_featured: is_featured === "true" || is_featured === true,
        };

        if (files && files.length > 0) {
            data.images = files.map(f => `/uploads/${f.filename}`);
        }

        const product = await prisma.product.update({ where: { id }, data });
        res.json(product);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao atualizar produto" });
    }
});

app.delete("/api/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({ where: { id } });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: "Erro ao deletar produto" });
    }
});

// --- ROTA DE PEDIDOS (API ORDERS) ---
app.get("/api/orders", async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.json([]); 
    }
});

// --- ROTA DE FALLBACK ADMIN ---
app.get("/admin", (req, res) => {
    res.sendFile(path.join(publicPath, "admin.html"));
});

// --- INICIALIZAÇÃO ---
app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Elétrica Moro Backend rodando em:`);
    console.log(`   > Local:    http://localhost:${port}`);
    console.log(`   > Rede/WSL: http://127.0.0.1:${port}`);
});