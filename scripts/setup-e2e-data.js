const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Checking and setting up E2E test data in PostgreSQL...");

  const testAdminEmail = (
    process.env.E2E_TEST_ADMIN_EMAIL || "e2e-test-admin@zodiac.test"
  ).toLowerCase();
  const testAdminPassword =
    process.env.E2E_TEST_ADMIN_PASSWORD || "E2E_Adm_646efddfbcee178876668dd25f89b36f";

  const passwordHash = await bcrypt.hash(testAdminPassword, 10);

  // 1. Ensure E2E Admin user exists
  const adminUser = await prisma.user.upsert({
    where: { email: testAdminEmail },
    update: {
      passwordHash: passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: "E2E Test Admin",
      email: testAdminEmail,
      passwordHash: passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("E2E Test Admin ensured:", adminUser.email, "id:", adminUser.id);

  // 2. Ensure Vast Carryall Series exists
  let series = await prisma.productSeries.findFirst({
    where: { slug: "vast-carryall-series" },
  });

  if (!series) {
    series = await prisma.productSeries.create({
      data: {
        name: "Vast Carryall Series",
        slug: "vast-carryall-series",
      },
    });
    console.log("Created Vast Carryall Series:", series.id);
  } else {
    console.log("Found existing Vast Carryall Series:", series.id);
  }

  // 3. Link Tote Bag & Outdoor Mat to series with specs
  const tote = await prisma.product.findFirst({
    where: { slug: "dawn-gong-vast-tote-bag" },
  });
  if (tote) {
    await prisma.product.update({
      where: { id: tote.id },
      data: {
        productSeriesId: series.id,
        dimensions: 'H15" x W18" x D6"',
        weightGrams: 350,
        capacityNote: 'Fits a 15" laptop, water bottle, jacket, and daily essentials',
      },
    });
    console.log("Updated Tote Bag specs & series");
  }

  const mat = await prisma.product.findFirst({
    where: { slug: "dawn-gong-outdoor-mat" },
  });
  if (mat) {
    await prisma.product.update({
      where: { id: mat.id },
      data: {
        productSeriesId: series.id,
        dimensions: 'L78" x W54"',
        weightGrams: 750,
        capacityNote: "Spacious for 2-4 persons, folds into compact roll with carrying strap",
      },
    });
    console.log("Updated Outdoor Mat specs & series");
  }

  console.log("E2E data setup completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error setting up E2E data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
