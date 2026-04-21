import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // A URL de migração (direta) vai aqui
    url: process.env.DIRECT_URL, 
  },
});