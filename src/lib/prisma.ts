import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg'; // Importação compatível com ES Modules
import "dotenv/config";

const { Pool } = pkg;

// Configuramos o pool de conexão do Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Instanciamos o Adapter para o Prisma 7
const adapter = new PrismaPg(pool);

// Exportamos uma única instância do Prisma para todo o projeto
export const prisma = new PrismaClient({ adapter });