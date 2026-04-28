import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

const router = Router();

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  cpf: z.string().max(20).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
});

/**
 * GET /api/customer/me — perfil do cliente logado.
 * Cria registro Customer automaticamente na primeira chamada (lazy upsert),
 * usando user.id do Supabase Auth como chave primária.
 */
router.get("/me", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = req.authUser!;
  const customer = await prisma.customer.upsert({
    where: { id: user.id },
    update: {}, // não toca em nada se já existe
    create: { id: user.id, email: user.email },
  });
  res.json({ ...customer, isAdmin: user.isAdmin });
}));

/**
 * PUT /api/customer/me — atualiza dados do perfil (cpf, phone, address, name).
 */
router.put("/me", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = req.authUser!;
  const parsed = UpdateProfileSchema.parse(req.body);

  const data: { name?: string; cpf?: string | null; phone?: string | null; address?: string | null } = {};
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.cpf !== undefined) data.cpf = parsed.cpf;
  if (parsed.phone !== undefined) data.phone = parsed.phone;
  if (parsed.address !== undefined) data.address = parsed.address;

  const customer = await prisma.customer.upsert({
    where: { id: user.id },
    update: data,
    create: { id: user.id, email: user.email, ...data },
  });
  res.json(customer);
}));

/**
 * GET /api/customer/orders — histórico de pedidos do cliente logado.
 */
router.get("/orders", requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = req.authUser!;
  const orders = await prisma.order.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}));

export default router;
