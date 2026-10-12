-- CreateEnum
CREATE TYPE "MarketplacePlatform" AS ENUM ('SHOPEE', 'TIKTOK_SHOP');

-- CreateTable
CREATE TABLE "MarketplaceAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" "MarketplacePlatform" NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceAccount_platform_idx" ON "MarketplaceAccount"("platform");

-- CreateIndex
CREATE INDEX "MarketplaceAccount_connectedById_idx" ON "MarketplaceAccount"("connectedById");

-- CreateIndex
CREATE INDEX "MarketplaceAccount_tokenExpiresAt_idx" ON "MarketplaceAccount"("tokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceAccount_platform_shopId_key" ON "MarketplaceAccount"("platform", "shopId");

-- AddForeignKey
ALTER TABLE "MarketplaceAccount" ADD CONSTRAINT "MarketplaceAccount_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
