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
    // 4. Categories (Bag Categories for it's matapanda)
    // Deactivate legacy clothing categories if they exist
    await prisma.category.updateMany({
        where: {
            slug: { in: ["apparel", "t-shirts", "outerwear-jackets", "headwear", "caps-hats"] },
        },
        data: { isActive: false, deletedAt: new Date() },
    });

    const toteBags = await prisma.category.upsert({
        where: { slug: "tote-bags" },
        update: { name: "Tote Bags", isActive: true, deletedAt: null },
        create: {
            name: "Tote Bags",
            slug: "tote-bags",
            isActive: true,
        },
    });

    const slingCrossbody = await prisma.category.upsert({
        where: { slug: "sling-crossbody" },
        update: { name: "Sling & Crossbody", isActive: true, deletedAt: null },
        create: {
            name: "Sling & Crossbody",
            slug: "sling-crossbody",
            isActive: true,
        },
    });

    const shoulderBags = await prisma.category.upsert({
        where: { slug: "shoulder-bags" },
        update: { name: "Shoulder Bags", isActive: true, deletedAt: null },
        create: {
            name: "Shoulder Bags",
            slug: "shoulder-bags",
            isActive: true,
        },
    });

    const backpacks = await prisma.category.upsert({
        where: { slug: "backpacks" },
        update: { name: "Backpacks", isActive: true, deletedAt: null },
        create: {
            name: "Backpacks",
            slug: "backpacks",
            isActive: true,
        },
    });

    const pouchesSmallGoods = await prisma.category.upsert({
        where: { slug: "pouches-small-goods" },
        update: { name: "Pouches & Small Goods", isActive: true, deletedAt: null },
        create: {
            name: "Pouches & Small Goods",
            slug: "pouches-small-goods",
            isActive: true,
        },
    });

    // Also upsert product series
    const dumplingSeries = await prisma.productSeries.upsert({
        where: { slug: "dumpling-series" },
        update: { name: "Dumpling Series" },
        create: {
            name: "Dumpling Series",
            slug: "dumpling-series",
        },
    });

    const canvasSeries = await prisma.productSeries.upsert({
        where: { slug: "canvas-carryall-series" },
        update: { name: "Canvas Carryall Series" },
        create: {
            name: "Canvas Carryall Series",
            slug: "canvas-carryall-series",
        },
    });
    // 5. Products List
    const PRODUCTS_DATA = [
        {
            sku: "IMP-DUMP-MIC",
            name: "Micro Dumpling Bag",
            slug: "micro-dumpling-bag",
            description: "Tas selempang micro ikonik dengan bahan crinkled nylon tahan air, penutup elastis gathered cord, dan strap yang dapat disesuaikan.",
            price: 489000,
            discountPrice: null,
            stock: 45,
            lowStockThreshold: 5,
            weightGrams: 140,
            dimensions: "H14 x W16 x D10 cm",
            capacityNote: "Muat smartphone, cardholder, kunci, dan lipstik",
            isNewArrival: true,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: slingCrossbody.id,
            productSeriesId: dumplingSeries.id,
            images: [
                "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-DUMP-MIC-OLV", size: "Micro", color: "Olive Green", stock: 12, lowStockThreshold: 5 },
                { sku: "IMP-DUMP-MIC-BLU", size: "Micro", color: "Cobalt Blue", stock: 15, lowStockThreshold: 5 },
                { sku: "IMP-DUMP-MIC-BLK", size: "Micro", color: "Charcoal Black", stock: 18, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "IMP-DUMP-XS",
            name: "XS Dumpling Bag",
            slug: "xs-dumpling-bag",
            description: "Ukuran favorit sehari-hari. Ringan, fleksibel, dengan kantong saku dalam dan hook kunci fungsional.",
            price: 589000,
            discountPrice: null,
            stock: 38,
            lowStockThreshold: 5,
            weightGrams: 210,
            dimensions: "H20 x W24 x D12 cm",
            capacityNote: "Muat dompet panjang, iPad mini, botol minum 500ml",
            isNewArrival: true,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: slingCrossbody.id,
            productSeriesId: dumplingSeries.id,
            images: [
                "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-DUMP-XS-CRM", size: "XS", color: "Butter Cream", stock: 14, lowStockThreshold: 5 },
                { sku: "IMP-DUMP-XS-BLK", size: "XS", color: "Charcoal Black", stock: 24, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "IMP-DUMP-M",
            name: "M Dumpling Bag",
            slug: "m-dumpling-bag",
            description: "Kapasitas lapang untuk kerja & traveling. Muat laptop 13-14 inch, payung lipat, dan perlengkapan harian.",
            price: 729000,
            discountPrice: 659000,
            stock: 26,
            lowStockThreshold: 5,
            weightGrams: 320,
            dimensions: "H32 x W38 x D15 cm",
            capacityNote: "Muat laptop 13-14 inch, botol minum 1L, payung, buku",
            isNewArrival: true,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: slingCrossbody.id,
            productSeriesId: dumplingSeries.id,
            images: [
                "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-DUMP-M-NVY", size: "M", color: "Midnight Navy", stock: 16, lowStockThreshold: 5 },
                { sku: "IMP-DUMP-M-SGE", size: "M", color: "Sage Green", stock: 10, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "IMP-TOTE-CANV",
            name: "Everyday Canvas Tote Bag",
            slug: "everyday-canvas-tote",
            description: "Tas tote kanvas 16oz tebal dengan kompartemen botol minum tegak, saku laptop empuk, dan saku ritsleting rahasia.",
            price: 389000,
            discountPrice: null,
            stock: 35,
            lowStockThreshold: 5,
            weightGrams: 420,
            dimensions: "H38 x W42 x D12 cm",
            capacityNote: "Muat laptop hingga 15.6 inch, map berkas A4, buku",
            isNewArrival: true,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: toteBags.id,
            productSeriesId: canvasSeries.id,
            images: [
                "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-TOTE-ECR", size: "Regular", color: "Natural Ecru", stock: 20, lowStockThreshold: 5 },
                { sku: "IMP-TOTE-BLK", size: "Regular", color: "Washed Black", stock: 15, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "IMP-SHLD-CRES",
            name: "Crescent Nylon Shoulder Bag",
            slug: "crescent-nylon-shoulder-bag",
            description: "Siluet bulan sabit ergonomis yang mengikuti kontur tubuh. Ringan dan serbaguna untuk gaya kasual.",
            price: 459000,
            discountPrice: null,
            stock: 22,
            lowStockThreshold: 5,
            weightGrams: 180,
            dimensions: "H19 x W34 x D9 cm",
            capacityNote: "Muat smartphone, dompet, kacamata, botol 350ml",
            isNewArrival: true,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: shoulderBags.id,
            images: [
                "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-SHLD-CRES-OLV", size: "Standard", color: "Khaki Olive", stock: 12, lowStockThreshold: 5 },
                { sku: "IMP-SHLD-CRES-BLK", size: "Standard", color: "Onyx Black", stock: 10, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "IMP-BKPK-COMM",
            name: "Packable Commuter Backpack",
            slug: "packable-commuter-backpack",
            description: "Ransel lipat berbobot ultra-ringan dengan kompartemen laptop 14 inch terpisah dan bahan ripstop nylon.",
            price: 549000,
            discountPrice: null,
            stock: 18,
            lowStockThreshold: 5,
            weightGrams: 360,
            dimensions: "H44 x W30 x D14 cm",
            capacityNote: "Kapasitas 18L, muat laptop 14 inch, jaket, charger",
            isNewArrival: true,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: backpacks.id,
            images: [
                "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-BKPK-COMM-SGE", size: "18L", color: "Sage Green", stock: 8, lowStockThreshold: 5 },
                { sku: "IMP-BKPK-COMM-BLK", size: "18L", color: "Matte Black", stock: 10, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "IMP-POUCH-ORGN",
            name: "Pouch & Tech Organizer",
            slug: "pouch-tech-organizer",
            description: "Pouch aksesoris multifungsi dengan sekat elastis untuk kabel, charger, earphone, dan perlengkapan kecil.",
            price: 199000,
            discountPrice: null,
            stock: 40,
            lowStockThreshold: 5,
            weightGrams: 95,
            dimensions: "H12 x W20 x D6 cm",
            capacityNote: "Muat powerbank, charger, mouse, kabel, dan kunci",
            isNewArrival: false,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: pouchesSmallGoods.id,
            images: [
                "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-POUCH-ORGN-LAV", size: "One Size", color: "Lilac Lavender", stock: 20, lowStockThreshold: 5 },
                { sku: "IMP-POUCH-ORGN-BLK", size: "One Size", color: "Charcoal Black", stock: 20, lowStockThreshold: 5 },
            ],
        },
        {
            sku: "IMP-UTIL-CROSS",
            name: "Mini Utility Crossbody",
            slug: "mini-utility-crossbody",
            description: "Tas selempang ringkas beraksen webbing industrial dengan carabiner ring serbaguna.",
            price: 349000,
            discountPrice: null,
            stock: 25,
            lowStockThreshold: 5,
            weightGrams: 160,
            dimensions: "H17 x W13 x D5 cm",
            capacityNote: "Muat smartphone hingga 6.7 inch, dompet kartu, paspor",
            isNewArrival: true,
            isActive: true,
            brandId: matapandaInHouse.id,
            categoryId: slingCrossbody.id,
            images: [
                "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
                "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=85",
            ],
            variants: [
                { sku: "IMP-UTIL-CROSS-KHK", size: "Mini", color: "Desert Khaki", stock: 13, lowStockThreshold: 5 },
                { sku: "IMP-UTIL-CROSS-BLK", size: "Mini", color: "Matte Black", stock: 12, lowStockThreshold: 5 },
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
                    dimensions: item.dimensions || null,
                    capacityNote: item.capacityNote || null,
                    productSeriesId: item.productSeriesId || null,
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
            const orderNumber = `IMP-${year}${monthStr}-${orderSeq}`;
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

    // Seed Storefront Banners
    const bannerCount = await prisma.banner.count();
    if (bannerCount === 0) {
        console.log("Seeding initial Hero & Secondary Banners...");
        const heroBanners = [
            {
                type: "HERO_BANNER",
                title: "New in",
                subtitle: "Koleksi Tas Terbaru it'smatapanda",
                imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Discover New in",
                ctaLink: "/new-arrivals",
                sortOrder: 0,
                isActive: true,
            },
            {
                type: "HERO_BANNER",
                title: "Tote Bags",
                subtitle: "Tas Tote Fungsional & Daily Carry",
                imageUrl: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Discover Tote Bags",
                ctaLink: "/categories/tote-bags",
                sortOrder: 1,
                isActive: true,
            },
            {
                type: "HERO_BANNER",
                title: "Dumpling & Sling",
                subtitle: "Siluet Gathered & Crossbody Ringan",
                imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Discover Sling Bags",
                ctaLink: "/categories/sling-crossbody",
                sortOrder: 2,
                isActive: true,
            },
            {
                type: "HERO_BANNER",
                title: "Shoulder Bags",
                subtitle: "Puffer & Hobo Modern",
                imageUrl: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Discover Shoulder Bags",
                ctaLink: "/categories/shoulder-bags",
                sortOrder: 3,
                isActive: true,
            },
            {
                type: "HERO_BANNER",
                title: "Backpacks",
                subtitle: "Ransel Urban & Commuter",
                imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Discover Backpacks",
                ctaLink: "/categories/backpacks",
                sortOrder: 4,
                isActive: true,
            },
            {
                type: "HERO_BANNER",
                title: "Small Goods",
                subtitle: "Pouches, Cardholders & Straps",
                imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Discover Small Goods",
                ctaLink: "/categories/pouches-small-goods",
                sortOrder: 5,
                isActive: true,
            },
        ];

        const secondaryBanners = [
            {
                type: "SECONDARY_BANNER",
                title: "Free shipping",
                subtitle: "With minimum spend inclusive of custom duties and taxes",
                description: "Nikmati pengiriman gratis ke seluruh Indonesia untuk setiap pembelian koleksi it'smatapanda",
                imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Shop The Collection",
                ctaLink: "/new-arrivals",
                sortOrder: 0,
                isActive: true,
            },
            {
                type: "SECONDARY_BANNER",
                title: "Everyday carryalls",
                subtitle: "Lightweight, water-resistant & made for modern living",
                description: "Eksplorasi koleksi tas fungsional dengan palet warna vibran dan material premium tahan air",
                imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Explore Bags",
                ctaLink: "/categories/bags-totes",
                sortOrder: 1,
                isActive: true,
            },
            {
                type: "SECONDARY_BANNER",
                title: "Colourblock Series",
                subtitle: "Playful tones designed for your everyday adventures",
                description: "Temukan perpaduan warna kontras yang ceria dan material nilon tahan lama khas it'smatapanda",
                imageUrl: "https://images.unsplash.com/photo-1575032617751-6ddec2089882?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Discover Colours",
                ctaLink: "/categories/bags-totes",
                sortOrder: 2,
                isActive: true,
            },
            {
                type: "SECONDARY_BANNER",
                title: "Urban Utility",
                subtitle: "Modular pouches, straps & versatile commuter bags",
                description: "Aksesoris modular dan tas kompartemen praktis untuk aktivitas harianmu yang dinamis",
                imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=2000&q=85",
                ctaText: "Shop Urban Gear",
                ctaLink: "/categories/backpacks",
                sortOrder: 3,
                isActive: true,
            },
        ];

        for (const item of [...heroBanners, ...secondaryBanners]) {
            await prisma.banner.create({ data: item });
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
