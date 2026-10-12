"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Seeding it's matapanda database with multi-year historical data (2024, 2025, 2026)...");
    const adminPasswordHash = await bcryptjs_1.default.hash(process.env.ADMIN_DEFAULT_PASSWORD || "admin123", 10);
    // 1. Admin User
    const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || "jorgifatwaambia@gmail.com").toLowerCase();
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            name: "it's matapanda Admin",
            email: adminEmail,
            passwordHash: adminPasswordHash,
            phone: "+6281290001111",
            role: "ADMIN",
        },
    });
    // 2. Customers
    const CUSTOMERS_DATA = [
        {
            name: "Raya Putra",
            email: "raya.putra@gmail.com",
            phone: "+628118889900",
            city: "Jakarta Selatan",
            street: "Jl. Senopati No. 64, Kebayoran Baru",
            province: "Jakarta",
            postalCode: "12190",
        },
        {
            name: "Nadia Kusuma",
            email: "nadia.kusuma@yahoo.com",
            phone: "+6281234567890",
            city: "Bandung",
            street: "Jl. Riau No. 128",
            province: "Jawa Barat",
            postalCode: "40115",
        },
        {
            name: "Dimas Anggara",
            email: "dimas.anggara@outlook.com",
            phone: "+6281399887766",
            city: "Surabaya",
            street: "Jl. Dharmahusada No. 45",
            province: "Jawa Timur",
            postalCode: "60285",
        },
        {
            name: "Sheila Dara",
            email: "sheila.dara@gmail.com",
            phone: "+6281722334455",
            city: "Jakarta Selatan",
            street: "Jl. Kemang Raya No. 12",
            province: "Jakarta",
            postalCode: "12730",
        },
        {
            name: "Kevin Sanjaya",
            email: "kevin.s@gmail.com",
            phone: "+6281988776655",
            city: "Denpasar",
            street: "Jl. Sunset Road No. 88, Seminyak",
            province: "Bali",
            postalCode: "80361",
        },
        {
            name: "Aurel Hermansyah",
            email: "aurel.h@gmail.com",
            phone: "+6281155443322",
            city: "Jakarta Barat",
            street: "Jl. Puri Indah Raya Blok A No. 3",
            province: "Jakarta",
            postalCode: "11610",
        },
    ];
    const createdCustomers = [];
    for (const c of CUSTOMERS_DATA) {
        const user = await prisma.user.upsert({
            where: { email: c.email },
            update: {},
            create: {
                name: c.name,
                email: c.email,
                phone: c.phone,
                role: "CUSTOMER",
                addresses: {
                    create: {
                        label: "Home",
                        recipient: c.name,
                        phone: c.phone,
                        street: c.street,
                        city: c.city,
                        province: c.province,
                        postalCode: c.postalCode,
                        country: "Indonesia",
                        countryCode: "ID",
                        isDefault: true,
                    },
                },
            },
            include: { addresses: true },
        });
        createdCustomers.push(user);
    }
    // 3. Brands
    const dawnGong = await prisma.brand.upsert({
        where: { slug: "dawn-gong" },
        update: {},
        create: {
            name: "Dawn Gong",
            slug: "dawn-gong",
            logoUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=200&q=80",
            isActive: true,
        },
    });
    const exodusBrand = await prisma.brand.upsert({
        where: { slug: "exodus-brand" },
        update: {},
        create: {
            name: "Exodus Brand",
            slug: "exodus-brand",
            logoUrl: "https://images.unsplash.com/photo-1508427953056-b00b8d78ebf5?auto=format&fit=crop&w=200&q=80",
            isActive: true,
        },
    });
    const slowRave = await prisma.brand.upsert({
        where: { slug: "slow-rave" },
        update: {},
        create: {
            name: "Slow Rave",
            slug: "slow-rave",
            logoUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=200&q=80",
            isActive: true,
        },
    });
    const matapandaInHouse = await prisma.brand.upsert({
        where: { slug: "itsmatapanda-in-house" },
        update: {},
        create: {
            name: "it's matapanda In-House",
            slug: "itsmatapanda-in-house",
            logoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
            isActive: true,
        },
    });
    await prisma.brand.upsert({
        where: { slug: "eleven" },
        update: {},
        create: {
            name: "Eleven",
            slug: "eleven",
            logoUrl: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=200&q=80",
            isActive: false,
        },
    });
    // 4. Categories (Parent-Child)
    const apparel = await prisma.category.upsert({
        where: { slug: "apparel" },
        update: {},
        create: {
            name: "Apparel",
            slug: "apparel",
            isActive: true,
        },
    });
    const tshirts = await prisma.category.upsert({
        where: { slug: "t-shirts" },
        update: {},
        create: {
            name: "T-Shirts",
            slug: "t-shirts",
            parentId: apparel.id,
            isActive: true,
        },
    });
    const outerwear = await prisma.category.upsert({
        where: { slug: "outerwear-jackets" },
        update: {},
        create: {
            name: "Outerwear & Jackets",
            slug: "outerwear-jackets",
            parentId: apparel.id,
            isActive: true,
        },
    });
    const headwear = await prisma.category.upsert({
        where: { slug: "headwear" },
        update: {},
        create: {
            name: "Headwear",
            slug: "headwear",
            isActive: true,
        },
    });
    const capsHats = await prisma.category.upsert({
        where: { slug: "caps-hats" },
        update: {},
        create: {
            name: "Caps & Hats",
            slug: "caps-hats",
            parentId: headwear.id,
            isActive: true,
        },
    });
    const objects = await prisma.category.upsert({
        where: { slug: "accessories-objects" },
        update: {},
        create: {
            name: "Accessories & Objects",
            slug: "accessories-objects",
            isActive: true,
        },
    });
    const bagsTotes = await prisma.category.upsert({
        where: { slug: "bags-totes" },
        update: {},
        create: {
            name: "Bags & Totes",
            slug: "bags-totes",
            parentId: objects.id,
            isActive: true,
        },
    });
    // 5. Products List
    const PRODUCTS_DATA = [
        {
            sku: "DG-SB01-WHT",
            name: "Dawn Gong Sunburn 01 T-shirt",
            slug: "dawn-gong-sunburn-01-t-shirt",
            description: "Rib round neck, graphic on the front. 100% heavyweight cotton jersey.",
            price: 500000,
            discountPrice: null,
            stock: 42,
            lowStockThreshold: 5,
            weightGrams: 280,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: tshirts.id,
            images: [
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-SB01-WHT-S", size: "S", color: "White", stock: 10, lowStockThreshold: 5 },
                { sku: "DG-SB01-WHT-M", size: "M", color: "White", stock: 15, lowStockThreshold: 5 },
                { sku: "DG-SB01-WHT-L", size: "L", color: "White", stock: 12, lowStockThreshold: 5 },
                { sku: "DG-SB01-WHT-XL", size: "XL", color: "White", stock: 5, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-FAM02-YLW",
            name: "Dawn Gong Fam 02 T-shirt",
            slug: "dawn-gong-fam-02-t-shirt",
            description: "Rib round neck, all-over tie-dye wash with graphic print on the front.",
            price: 350000,
            discountPrice: null,
            stock: 28,
            lowStockThreshold: 5,
            weightGrams: 270,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: tshirts.id,
            images: [
                "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-FAM02-YLW-S", size: "S", color: "Yellow Tie-Dye", stock: 8, lowStockThreshold: 5 },
                { sku: "DG-FAM02-YLW-M", size: "M", color: "Yellow Tie-Dye", stock: 14, lowStockThreshold: 5 },
                { sku: "DG-FAM02-YLW-L", size: "L", color: "Yellow Tie-Dye", stock: 4, lowStockThreshold: 5 },
                { sku: "DG-FAM02-YLW-XL", size: "XL", color: "Yellow Tie-Dye", stock: 2, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-FAM01-BRN",
            name: "Dawn Gong Fam 01 T-shirt",
            slug: "dawn-gong-fam-01-t-shirt",
            description: "Rib round neck, graphic on the front. 100% cotton heavyweight jersey.",
            price: 350000,
            discountPrice: 315000,
            stock: 35,
            lowStockThreshold: 5,
            weightGrams: 270,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: tshirts.id,
            images: [
                "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-FAM01-BRN-S", size: "S", color: "Brown", stock: 10, lowStockThreshold: 5 },
                { sku: "DG-FAM01-BRN-M", size: "M", color: "Brown", stock: 20, lowStockThreshold: 5 },
                { sku: "DG-FAM01-BRN-L", size: "L", color: "Brown", stock: 5, lowStockThreshold: 5 },
                { sku: "DG-FAM01-BRN-XL", size: "XL", color: "Brown", stock: 0, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-SB02-BLK",
            name: "Dawn Gong Sunburn 02 T-shirt",
            slug: "dawn-gong-sunburn-02-t-shirt",
            description: "Rib round neck, chest graphic print on the front and back.",
            price: 500000,
            discountPrice: null,
            stock: 19,
            lowStockThreshold: 5,
            weightGrams: 280,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: tshirts.id,
            images: [
                "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-SB02-BLK-S", size: "S", color: "Charcoal", stock: 0, lowStockThreshold: 5 },
                { sku: "DG-SB02-BLK-M", size: "M", color: "Charcoal", stock: 10, lowStockThreshold: 5 },
                { sku: "DG-SB02-BLK-L", size: "L", color: "Charcoal", stock: 9, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-GAZA-BLK",
            name: "Dawn Gong Gaza T-shirt",
            slug: "dawn-gong-gaza-t-shirt",
            description: "Rib round neck, Peaceful Noise typography graphic on the front.",
            price: 369000,
            discountPrice: null,
            stock: 24,
            lowStockThreshold: 5,
            weightGrams: 260,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: tshirts.id,
            images: [
                "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-GAZA-BLK-S", size: "S", color: "Black", stock: 6, lowStockThreshold: 5 },
                { sku: "DG-GAZA-BLK-M", size: "M", color: "Black", stock: 12, lowStockThreshold: 5 },
                { sku: "DG-GAZA-BLK-L", size: "L", color: "Black", stock: 6, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-VST02-RAG",
            name: "Dawn Gong Vast 02 T-shirt",
            slug: "dawn-gong-vast-02-t-shirt",
            description: "Contrast long-sleeve raglan t-shirt, rib round neck, graphic on the front.",
            price: 550000,
            discountPrice: null,
            stock: 18,
            lowStockThreshold: 5,
            weightGrams: 320,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: tshirts.id,
            images: [
                "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-VST02-RAG-M", size: "M", color: "Olive / Cream", stock: 10, lowStockThreshold: 5 },
                { sku: "DG-VST02-RAG-L", size: "L", color: "Olive / Cream", stock: 8, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-VST01-BRN",
            name: "Dawn Gong Vast 01 T-shirt",
            slug: "dawn-gong-vast-01-t-shirt",
            description: "Long-sleeve t-shirt with textured panel sleeves and chest embroidery.",
            price: 550000,
            discountPrice: null,
            stock: 15,
            lowStockThreshold: 5,
            weightGrams: 310,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: tshirts.id,
            images: [
                "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-VST01-BRN-M", size: "M", color: "Brown", stock: 8, lowStockThreshold: 5 },
                { sku: "DG-VST01-BRN-L", size: "L", color: "Brown", stock: 7, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-ABV-JKT",
            name: "Dawn Gong Above Jacket",
            slug: "dawn-gong-above-jacket",
            description: "Full-zip hooded technical jacket with embroidered chest emblem and adjustable cuffs.",
            price: 799000,
            discountPrice: null,
            stock: 11,
            lowStockThreshold: 5,
            weightGrams: 600,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: outerwear.id,
            images: [
                "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-ABV-JKT-L", size: "L", color: "Navy / Black", stock: 6, lowStockThreshold: 5 },
                { sku: "DG-ABV-JKT-XL", size: "XL", color: "Navy / Black", stock: 5, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-NWS02-CAP",
            name: "Dawn Gong News 02 Cap",
            slug: "dawn-gong-news-02-cap",
            description: "6-panel structured cotton twill cap with front sunburn graphic embroidery.",
            price: 399000,
            discountPrice: null,
            stock: 8,
            lowStockThreshold: 5,
            weightGrams: 150,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: capsHats.id,
            images: [
                "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-NWS02-CAP-OS", size: "One Size", color: "Khaki", stock: 8, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-NWS03-CAP",
            name: "Dawn Gong News 03 Cap",
            slug: "dawn-gong-news-03-cap",
            description: "6-panel structured cotton twill cap with contrast front embroidery.",
            price: 399000,
            discountPrice: null,
            stock: 0,
            lowStockThreshold: 5,
            weightGrams: 150,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: capsHats.id,
            images: [
                "https://images.unsplash.com/photo-1534215754734-18e55d13e346?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-NWS03-CAP-OS", size: "One Size", color: "Black", stock: 0, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-OUT-MAT",
            name: "Dawn Gong Outdoor Mat",
            slug: "dawn-gong-outdoor-mat",
            description: "Woven jacquard outdoor mat with custom Dawn Gong botanical artwork.",
            price: 650000,
            discountPrice: null,
            stock: 6,
            lowStockThreshold: 5,
            weightGrams: 850,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: objects.id,
            images: [
                "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-OUT-MAT-OS", size: "One Size", color: "Multi / Olive", stock: 6, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "DG-VST-TOTE",
            name: "Dawn Gong Vast Tote Bag",
            slug: "dawn-gong-vast-tote-bag",
            description: "Heavyweight canvas tote bag with front Dawn Gong graphic screenprint.",
            price: 479000,
            discountPrice: null,
            stock: 16,
            lowStockThreshold: 5,
            weightGrams: 300,
            isNewArrival: true,
            isActive: true,
            brandId: dawnGong.id,
            categoryId: bagsTotes.id,
            images: [
                "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "DG-VST-TOTE-OS", size: "One Size", color: "White", stock: 16, lowStockThreshold: 5 },
            ],
        },
    ];
    const createdProducts = [];
    for (const item of PRODUCTS_DATA) {
        const existing = await prisma.product.findUnique({
            where: { sku: item.sku },
            include: { images: true, variants: true },
        });
        let prodRecord;
        if (existing) {
            prodRecord = await prisma.product.update({
                where: { id: existing.id },
                data: {
                    isNewArrival: item.isNewArrival,
                    lowStockThreshold: item.lowStockThreshold,
                    stock: item.stock,
                    isActive: item.isActive,
                },
                include: { variants: true },
            });
        }
        else {
            prodRecord = await prisma.product.create({
                data: {
                    name: item.name,
                    slug: item.slug,
                    sku: item.sku,
                    description: item.description,
                    price: item.price,
                    discountPrice: item.discountPrice,
                    stock: item.stock,
                    lowStockThreshold: item.lowStockThreshold,
                    weightGrams: item.weightGrams,
                    isNewArrival: item.isNewArrival,
                    isActive: item.isActive,
                    brandId: item.brandId,
                    categoryId: item.categoryId,
                    images: {
                        create: item.images.map((url, idx) => ({
                            url,
                            isPrimary: idx === 0,
                            sortOrder: idx,
                        })),
                    },
                    variants: {
                        create: item.variants.map((v) => ({
                            sku: v.sku,
                            size: v.size,
                            color: v.color,
                            stock: v.stock,
                            lowStockThreshold: v.lowStockThreshold,
                        })),
                    },
                },
                include: { variants: true },
            });
        }
        createdProducts.push(prodRecord);
    }
    // 6. Generate Realistic Multi-Year Historical Orders (2024, 2025, 2026)
    console.log("Generating multi-year orders (2024 - 2026)...");
    // Define monthly order generation targets for realism (seasonal fluctuations)
    const monthlyPlans = [];
    // 2024 (12 months)
    const count2024 = [12, 14, 22, 28, 16, 18, 20, 24, 30, 26, 34, 42]; // e.g. peaks in Apr (Lebaran), Nov/Dec
    for (let m = 1; m <= 12; m++) {
        monthlyPlans.push({ year: 2024, month: m, orderCount: count2024[m - 1] });
    }
    // 2025 (12 months)
    const count2025 = [20, 22, 35, 42, 25, 28, 30, 36, 48, 40, 56, 68];
    for (let m = 1; m <= 12; m++) {
        monthlyPlans.push({ year: 2025, month: m, orderCount: count2025[m - 1] });
    }
    // 2026 (Jan to Sep)
    const count2026 = [32, 36, 50, 62, 40, 45, 52, 58, 72];
    for (let m = 1; m <= 9; m++) {
        monthlyPlans.push({ year: 2026, month: m, orderCount: count2026[m - 1] });
    }
    let totalSeededOrders = 0;
    for (const plan of monthlyPlans) {
        const { year, month, orderCount } = plan;
        const monthStr = month < 10 ? `0${month}` : `${month}`;
        for (let i = 1; i <= orderCount; i++) {
            const orderSeq = i < 10 ? `00${i}` : i < 100 ? `0${i}` : `${i}`;
            const orderNumber = `ZOD-${year}${monthStr}-${orderSeq}`;
            // Check if order already exists to prevent duplication
            const existingOrder = await prisma.order.findUnique({
                where: { orderNumber },
            });
            if (existingOrder)
                continue;
            // Random day in month
            const maxDays = month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
            const day = Math.floor(1 + ((i * 7) % maxDays));
            const dayStr = day < 10 ? `0${day}` : `${day}`;
            const hour = Math.floor(9 + ((i * 3) % 13));
            const minute = Math.floor((i * 17) % 60);
            const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
            const minStr = minute < 10 ? `0${minute}` : `${minute}`;
            const orderDate = new Date(`${year}-${monthStr}-${dayStr}T${hourStr}:${minStr}:00.000Z`);
            // Determine customer
            const customer = createdCustomers[i % createdCustomers.length];
            const address = customer.addresses?.[0];
            // Status distribution
            let status = "COMPLETED";
            if (year === 2026 && month === 9 && day > 25) {
                // Recent orders
                const mod = i % 10;
                if (mod === 0)
                    status = "CANCELLED";
                else if (mod === 1 || mod === 2)
                    status = "PENDING";
                else if (mod === 3 || mod === 4)
                    status = "PAID";
                else if (mod === 5 || mod === 6)
                    status = "SHIPPED";
                else
                    status = "COMPLETED";
            }
            else {
                const mod = i % 20;
                if (mod === 0)
                    status = "CANCELLED";
                else if (mod === 1)
                    status = "PENDING";
                else if (mod === 2)
                    status = "PAID";
                else if (mod === 3 || mod === 4)
                    status = "SHIPPED";
                else
                    status = "COMPLETED";
            }
            // Pick 1 to 3 random products for items
            const itemCount = 1 + (i % 3);
            let subtotal = 0;
            const itemsToCreate = [];
            for (let j = 0; j < itemCount; j++) {
                const prod = createdProducts[(i + j * 3) % createdProducts.length];
                const variant = prod.variants?.[j % (prod.variants?.length || 1)] || {
                    id: null,
                    size: "M",
                    color: "White",
                    sku: prod.sku,
                };
                const unitPrice = Number(prod.discountPrice || prod.price);
                const qty = 1 + ((i + j) % 2);
                const itemSubtotal = unitPrice * qty;
                subtotal += itemSubtotal;
                itemsToCreate.push({
                    productId: prod.id,
                    variantId: variant.id,
                    productName: prod.name,
                    sku: variant.sku || prod.sku,
                    size: variant.size,
                    color: variant.color,
                    unitPrice,
                    quantity: qty,
                    subtotal: itemSubtotal,
                    createdAt: orderDate,
                });
            }
            const shippingCost = address?.city.includes("Jakarta") ? 14000 : 28000;
            const totalAmount = subtotal + shippingCost;
            // Create Order with relations
            const order = await prisma.order.create({
                data: {
                    orderNumber,
                    userId: customer.id,
                    addressId: address?.id || null,
                    status,
                    subtotal,
                    shippingCost,
                    totalAmount,
                    currency: "IDR",
                    createdAt: orderDate,
                    updatedAt: orderDate,
                    items: {
                        create: itemsToCreate,
                    },
                },
            });
            // Create Payment
            const paymentStatus = status === "COMPLETED" || status === "SHIPPED" || status === "PAID"
                ? "SETTLEMENT"
                : status === "CANCELLED"
                    ? "CANCEL"
                    : "PENDING";
            await prisma.payment.create({
                data: {
                    orderId: order.id,
                    midtransOrderId: `MID-${orderNumber}`,
                    midtransTransactionId: `TRX-${orderNumber}`,
                    snapToken: `snap-token-${orderNumber}`,
                    status: paymentStatus,
                    grossAmount: totalAmount,
                    paidAt: paymentStatus === "SETTLEMENT" ? orderDate : null,
                    createdAt: orderDate,
                    updatedAt: orderDate,
                },
            });
            // Create Shipment
            const shipmentStatus = status === "COMPLETED"
                ? "DELIVERED"
                : status === "SHIPPED"
                    ? "IN_TRANSIT"
                    : "PENDING";
            await prisma.shipment.create({
                data: {
                    orderId: order.id,
                    courier: "JNE",
                    serviceName: "REG",
                    trackingNumber: `JNE${year}${monthStr}${orderSeq}ID`,
                    status: shipmentStatus,
                    shippingCost,
                    weightGrams: 500 * itemCount,
                    originCity: "Jakarta Selatan",
                    destinationCity: address?.city || "Jakarta",
                    destinationCountry: "Indonesia",
                    shippedAt: status === "COMPLETED" || status === "SHIPPED" ? orderDate : null,
                    deliveredAt: status === "COMPLETED" ? new Date(orderDate.getTime() + 2 * 86400000) : null,
                    createdAt: orderDate,
                    updatedAt: orderDate,
                },
            });
            totalSeededOrders++;
        }
    }
    console.log(`Database seeded successfully! Total orders generated: ${totalSeededOrders}`);
}
main()
    .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
