-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingFee" DOUBLE PRECISION,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "on_sale" BOOLEAN NOT NULL DEFAULT false;
