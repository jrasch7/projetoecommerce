import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError } from "../lib/errors.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAdmin, type AdminRequest } from "../middleware/requireAdmin.js";

const router = Router();

const InviteSchema = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * GET /api/admin/me — devolve o usuário admin autenticado.
 */
router.get("/me", requireAdmin, asyncHandler(async (req: AdminRequest, res) => {
  res.json(req.adminUser);
}));

/**
 * POST /api/admin/invite — envia convite por email para um novo colaborador.
 * O usuário convidado já é criado com `is_admin: true` e cai na página
 * /admin-set-password.html para definir senha.
 */
router.post("/invite", requireAdmin, asyncHandler(async (req, res) => {
  const { email } = InviteSchema.parse(req.body);

  const origin = (req.headers.origin as string) || `${req.protocol}://${req.get("host")}`;
  const redirectTo = `${origin}/set-password.html`;

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { is_admin: true },
    redirectTo,
  });

  if (error) {
    throw new AppError(400, `Falha ao enviar convite: ${error.message}`);
  }

  res.status(201).json({
    user: { id: data.user?.id, email: data.user?.email },
    message: "Convite enviado com sucesso",
  });
}));

/**
 * GET /api/admin/users — lista todos os admins (filtra `is_admin: true`).
 */
router.get("/users", requireAdmin, asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw new AppError(500, error.message);
  const admins = data.users
    .filter((u) => u.user_metadata?.["is_admin"] === true)
    .map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
    }));
  res.json(admins);
}));

/**
 * DELETE /api/admin/users/:id — remove um admin (revoga acesso).
 * Não permite o admin atual se auto-deletar.
 */
router.delete("/users/:id", requireAdmin, asyncHandler(async (req: AdminRequest, res) => {
  const id = req.params["id"] as string;
  if (id === req.adminUser?.id) {
    throw new AppError(400, "Você não pode remover sua própria conta");
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) throw new AppError(500, error.message);
  res.status(204).send();
}));

export default router;
