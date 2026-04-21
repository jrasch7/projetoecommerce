import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import "dotenv/config";

// 1. Instanciamos o Adapter passando a URL do banco do Supabase
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

// 2. Injetamos o Adapter obrigatoriamente no Prisma Client
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Semeando dados no Supabase...');

  // Limpa o banco antes para não duplicar
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      { 
        name: 'Disjuntor Monopolar 20A DIN', 
        price: 18.50, 
        category: 'Eletroferragens', 
        stock: 50,
        description: 'Disjuntor de alta qualidade para proteção de circuitos residenciais.',
        is_featured: true 
      },
      { 
        name: 'Cabo Flexível 2,5mm Azul 100m', 
        price: 215.90, 
        category: 'Fios e Cabos', 
        stock: 12,
        description: 'Cabo isolado para instalações elétricas internas.',
        is_featured: true 
      },
      { 
        name: 'Lâmpada LED 9W Branca Fria', 
        price: 12.90, 
        category: 'Iluminação', 
        stock: 100,
        description: 'Economia e durabilidade para ambientes internos.',
        is_featured: false 
      }
    ],
  });

  console.log('✅ Banco de dados populado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });