# mcp-shopify

Manage Shopify stores — products, orders, customers, and inventory via Admin API.

## Tools

| Tool | Description |
|------|-------------|
| `list_products` | List products. |
| `get_product` | Get product details. |
| `list_orders` | List recent orders. |
| `get_order` | Get order details. |
| `list_customers` | List customers. |
| `get_inventory` | Get inventory levels for a location. |
| `get_shop` | Get shop info. |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_SHOP` | Yes | Shopify store domain (e.g. mystore.myshopify.com) |
| `SHOPIFY_ACCESS_TOKEN` | Yes | Shopify Admin API access token |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-shopify.git
cd mcp-shopify
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopify": {
      "command": "node",
      "args": ["/path/to/mcp-shopify/dist/index.js"],
      "env": {
        "SHOPIFY_SHOP": "your-shopify-shop",
        "SHOPIFY_ACCESS_TOKEN": "your-shopify-access-token"
      }
    }
  }
}
```

## Usage with npx

```bash
npx mcp-shopify
```

## License

MIT
