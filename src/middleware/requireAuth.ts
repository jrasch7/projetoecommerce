import type { Request, Response, NextFunction } from "express";
import { supabasePublic } from "../lib/supabase.js";
import { AppError } from "../lib/errors.js";

export interface AuthRequest extends Request {
  authUser?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

/**
 * Middleware que valida o JWT do Supabase Auth (Bearer token).
 * Diferente de requireAdmin, NÃO exige is_admin — qualquer usuário logado passa.
 * Útil para rotas de cliente (perfil, meus pedidos, wishlist).
 */
export async function requireAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) throw new AppError(401, "Token não fornecido");

    const { data, error } = await supabasePublic.auth.getUser(token);
    if (error || !data.user) throw new AppError(401, "Token inválido ou expirado");

    req.authUser = {
      id: data.user.id,
      email: data.user.email ?? "",
      isAdmin: data.user.user_metadata?.["is_admin"] === true,
    };
    next();
  } catch (err) {
    next(err);
  }
}
