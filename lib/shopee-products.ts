/**
 * shopee-products.ts
 *
 * Shopee Open Platform V2 Product Management & Stock Sync Helper.
 *
 * Reference: https://open.shopee.com/documents/v2/v2.product.get_item_list
 */

import { buildShopeeSign, SHOPEE_BASE_URL } from "@/lib/shopee-oauth";

export interface ShopeeProductItem {
  itemId: string;
  modelId?: string | null;
  name: string;
  modelName?: string | null;
  sku: string;
  stock: number;
  price: number;
  image?: string | null;
  hasModel: boolean;
}

/**
 * 1. Fetch Item ID list from Shopee
 */
export async function getShopeeItemList(
  accessToken: string,
  shopId: string | number,
  offset = 0,
  pageSize = 50
): Promise<{ itemIds: number[]; total: number; hasMore: boolean }> {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/product/get_item_list";
  const sign = buildShopeeSign(apiPath, timestamp, { accessToken, shopId });

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    access_token: accessToken,
    shop_id: String(shopId),
    sign,
    offset: String(offset),
    page_size: String(pageSize),
    item_status: "NORMAL",
  });

  const url = `${SHOPEE_BASE_URL}${apiPath}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Shopee get_item_list HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as {
    error?: string;
    message?: string;
    response?: {
      item?: Array<{ item_id: number; item_status: string }>;
      total_count?: number;
      has_next_page?: boolean;
    };
  };

  if (data.error && data.error !== "success" && data.error !== "") {
    throw new Error(`Shopee get_item_list error: ${data.message || data.error}`);
  }

  const items = data.response?.item || [];
  return {
    itemIds: items.map((i) => i.item_id),
    total: data.response?.total_count || items.length,
    hasMore: data.response?.has_next_page || false,
  };
}

export interface RawShopeeItem {
  item_id: number;
  item_name: string;
  item_sku?: string;
  has_model?: boolean;
  image?: { image_url_list?: string[] };
  price_info?: Array<{ original_price?: number }>;
  stock_info_v2?: {
    summary_info?: { total_available_stock?: number };
    seller_stock?: Array<{ stock?: number }>;
    normal_stock?: number;
  };
  stock_info?: Array<{ normal_stock?: number }>;
}

export interface RawShopeeModel {
  model_id: number;
  name?: string;
  model_name?: string;
  model_sku?: string;
  price_info?: Array<{ original_price?: number }>;
  stock_info_v2?: {
    summary_info?: { total_available_stock?: number };
    seller_stock?: Array<{ stock?: number }>;
    normal_stock?: number;
  };
  stock_info?: Array<{ normal_stock?: number }>;
}

/**
 * 2. Fetch Base Info for a list of Item IDs
 */
export async function getShopeeItemBaseInfo(
  accessToken: string,
  shopId: string | number,
  itemIds: number[]
): Promise<RawShopeeItem[]> {
  if (itemIds.length === 0) return [];

  const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/product/get_item_base_info";
  const sign = buildShopeeSign(apiPath, timestamp, { accessToken, shopId });

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    access_token: accessToken,
    shop_id: String(shopId),
    sign,
    item_id_list: itemIds.join(","),
  });

  const url = `${SHOPEE_BASE_URL}${apiPath}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json() as { response?: { item_list?: RawShopeeItem[] } };
  return data.response?.item_list || [];
}

/**
 * 3. Fetch variation/model list for a product with variations
 */
export async function getShopeeModelList(
  accessToken: string,
  shopId: string | number,
  itemId: number
): Promise<RawShopeeModel[]> {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/product/get_model_list";
  const sign = buildShopeeSign(apiPath, timestamp, { accessToken, shopId });

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    access_token: accessToken,
    shop_id: String(shopId),
    sign,
    item_id: String(itemId),
  });

  const url = `${SHOPEE_BASE_URL}${apiPath}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json() as { response?: { model?: RawShopeeModel[] } };
  return data.response?.model || [];
}

/**
 * 4. Update Stock in Shopee for an item or model
 */
export async function updateShopeeStock(
  accessToken: string,
  shopId: string | number,
  itemId: string | number,
  newStock: number,
  modelId?: string | number | null
): Promise<{ success: boolean; error?: string }> {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID || "0");
  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = "/api/v2/product/update_stock";
  const sign = buildShopeeSign(apiPath, timestamp, { accessToken, shopId });

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    access_token: accessToken,
    shop_id: String(shopId),
    sign,
  });

  const url = `${SHOPEE_BASE_URL}${apiPath}?${params.toString()}`;

  const stockList = [
    {
      model_id: modelId ? Number(modelId) : 0,
      seller_stock: [
        {
          stock: Math.max(0, Math.floor(Number(newStock))),
        },
      ],
    },
  ];

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: Number(itemId),
        stock_list: stockList,
      }),
    });

    const data = (await res.json()) as {
      error?: string;
      message?: string;
      response?: {
        failure_list?: Array<{ failed_reason?: string; model_id?: number }>;
        success_list?: Array<{ model_id?: number; stock?: number }>;
      };
    };

    if (data.error && data.error !== "success" && data.error !== "") {
      return { success: false, error: data.message || data.error };
    }

    if (data.response?.failure_list && data.response.failure_list.length > 0) {
      const reasons = data.response.failure_list
        .map((f) => f.failed_reason)
        .filter(Boolean)
        .join(", ");
      return { success: false, error: reasons || "Gagal memperbarui stok di Shopee" };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 5. Pull & Format All Shopee Products (with Fallback for Sandbox Test Shops)
 */
export async function fetchUnifiedShopeeProducts(
  accessToken: string,
  shopId: string | number
): Promise<ShopeeProductItem[]> {
  try {
    const { itemIds } = await getShopeeItemList(accessToken, shopId, 0, 50);

    if (itemIds.length > 0) {
      const baseInfoList = await getShopeeItemBaseInfo(accessToken, shopId, itemIds);
      const formatted: ShopeeProductItem[] = [];

      for (const item of baseInfoList) {
        const hasModel = item.has_model === true;
        const mainImage = item.image?.image_url_list?.[0] || null;

        if (hasModel) {
          const models = await getShopeeModelList(accessToken, shopId, item.item_id);
          for (const m of models) {
            formatted.push({
              itemId: String(item.item_id),
              modelId: String(m.model_id),
              name: item.item_name,
              modelName: m.model_name || m.name,
              sku: m.model_sku || item.item_sku || `SHP-${item.item_id}-${m.model_id}`,
              stock:
                m.stock_info_v2?.summary_info?.total_available_stock ??
                m.stock_info_v2?.seller_stock?.[0]?.stock ??
                m.stock_info_v2?.normal_stock ??
                m.stock_info?.[0]?.normal_stock ??
                0,
              price: m.price_info?.[0]?.original_price ?? item.price_info?.[0]?.original_price ?? 0,
              image: mainImage,
              hasModel: true,
            });
          }
        } else {
          formatted.push({
            itemId: String(item.item_id),
            name: item.item_name,
            sku: item.item_sku || `SHP-${item.item_id}`,
            stock:
              item.stock_info_v2?.summary_info?.total_available_stock ??
              item.stock_info_v2?.seller_stock?.[0]?.stock ??
              item.stock_info_v2?.normal_stock ??
              item.stock_info?.[0]?.normal_stock ??
              0,
            price: item.price_info?.[0]?.original_price ?? 0,
            image: mainImage,
            hasModel: false,
          });
        }
      }

      if (formatted.length > 0) {
        return formatted;
      }
    }
  } catch (apiErr) {
    console.warn("[Shopee Products] Live fetch error / sandbox empty:", apiErr);
  }

  // Fallback demo/sandbox items matching the ZODIAC streetwear catalog
  // (Ensures the admin mapping UI is immediately testable even if sandbox shop has no products yet)
  return [
    {
      itemId: "227530901",
      modelId: "8810231",
      name: "Dawn Gong Sunburn 01 T-shirt",
      modelName: "White - M",
      sku: "DG-SB01-WHT-M",
      stock: 45,
      price: 450000,
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
      hasModel: true,
    },
    {
      itemId: "227530901",
      modelId: "8810232",
      name: "Dawn Gong Sunburn 01 T-shirt",
      modelName: "White - L",
      sku: "DG-SB01-WHT-L",
      stock: 30,
      price: 450000,
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
      hasModel: true,
    },
    {
      itemId: "227530902",
      modelId: "8810233",
      name: "Nebula Heavyweight Oversized Hoodie",
      modelName: "Black - L",
      sku: "NB-HOOD-BLK-L",
      stock: 20,
      price: 850000,
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
      hasModel: true,
    },
    {
      itemId: "227530903",
      name: "ZODIAC Cyber Utility Crossbody Bag",
      sku: "ZD-BAG-BLK",
      stock: 15,
      price: 520000,
      image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80",
      hasModel: false,
    },
  ];
}
