#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const RATE_LIMIT_MS = 250;
let lastRequestTime = 0;

function getConfig(): { shop: string; token: string } {
  const shop = process.env.SHOPIFY_SHOP; // e.g. "mystore.myshopify.com"
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!shop || !token) throw new Error("SHOPIFY_SHOP and SHOPIFY_ACCESS_TOKEN required");
  return { shop, token };
}

async function shopifyFetch(path: string, method = "GET", body?: any): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  lastRequestTime = Date.now();

  const { shop, token } = getConfig();
  const url = `https://${shop}/admin/api/2024-01${path}`;
  const opts: RequestInit = {
    method,
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) { const e = await res.text().catch(() => ""); throw new Error(`Shopify ${res.status}: ${e.slice(0, 500)}`); }
  return res.json();
}

const server = new McpServer({ name: "mcp-shopify", version: "1.0.0" });

server.tool("list_products", "List products.", {
  limit: z.number().min(1).max(250).default(50),
  title: z.string().optional().describe("Filter by title"),
  status: z.enum(["active", "draft", "archived"]).optional(),
}, async ({ limit, title, status }) => {
  const p = new URLSearchParams({ limit: String(limit) });
  if (title) p.set("title", title);
  if (status) p.set("status", status);
  const data = await shopifyFetch(`/products.json?${p}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data.products, null, 2) }] };
});

server.tool("get_product", "Get product details.", {
  productId: z.string().describe("Product ID"),
}, async ({ productId }) => {
  const data = await shopifyFetch(`/products/${productId}.json`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data.product, null, 2) }] };
});

server.tool("list_orders", "List recent orders.", {
  limit: z.number().min(1).max(250).default(50),
  status: z.enum(["open", "closed", "cancelled", "any"]).default("any"),
  financialStatus: z.enum(["authorized", "pending", "paid", "refunded", "voided", "any"]).optional(),
}, async ({ limit, status, financialStatus }) => {
  const p = new URLSearchParams({ limit: String(limit), status });
  if (financialStatus) p.set("financial_status", financialStatus);
  const data = await shopifyFetch(`/orders.json?${p}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data.orders, null, 2) }] };
});

server.tool("get_order", "Get order details.", {
  orderId: z.string(),
}, async ({ orderId }) => {
  const data = await shopifyFetch(`/orders/${orderId}.json`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data.order, null, 2) }] };
});

server.tool("list_customers", "List customers.", {
  limit: z.number().min(1).max(250).default(50),
  query: z.string().optional().describe("Search query"),
}, async ({ limit, query }) => {
  if (query) {
    const data = await shopifyFetch(`/customers/search.json?query=${encodeURIComponent(query)}&limit=${limit}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data.customers, null, 2) }] };
  }
  const data = await shopifyFetch(`/customers.json?limit=${limit}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data.customers, null, 2) }] };
});

server.tool("get_inventory", "Get inventory levels for a location.", {
  locationId: z.string().describe("Location ID"),
  limit: z.number().min(1).max(250).default(50),
}, async ({ locationId, limit }) => {
  const data = await shopifyFetch(`/inventory_levels.json?location_ids=${locationId}&limit=${limit}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(data.inventory_levels, null, 2) }] };
});

server.tool("get_shop", "Get shop info.", {}, async () => {
  const data = await shopifyFetch("/shop.json");
  return { content: [{ type: "text" as const, text: JSON.stringify(data.shop, null, 2) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
