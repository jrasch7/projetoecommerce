import type { Request, Response, NextFunction } from "express";
import { supabasePublic } from "../lib/supabase.js";
import { AppError } from "../lib/errors.js";

export interface AdminRequest extends Request {
  adminUser?: { id: string; email: string };
}

/**
 * Middleware que valida o JWT do Supabase Auth (header `Authorization: Bearer ...`)
 * e exige `user_metadata.is_admin === true`. Caso contrário, devolve 401 ou 403.
 */
export async function requireAdmin(
  req: AdminRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) {
      throw new AppError(401, "Token não fornecido");
    }

    const { data, error } = await supabasePublic.auth.getUser(token);
    if (error || !data.user) {
      throw new AppError(401, "Token inválido ou expirado");
    }

    const isAdmin = data.user.user_metadata?.["is_admin"] === true;
    if (!isAdmin) {
      throw new AppError(403, "Acesso restrito a administradores");
    }

    req.adminUser = { id: data.user.id, email: data.user.email ?? "" };
    next();
  } catch (err) {
    next(err);
  }
}
