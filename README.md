[README (1).md](https://github.com/user-attachments/files/26874319/README.1.md)
# ⚡ Zyrova — Premium Tech E-Commerce

A high-end, frontend-only e-commerce showcase for the Zyrova tech brand.
Dark theme, Apple-level polish, fully responsive.

---

## 📁 File Structure

```
zyrova/
├── index.html      ← Home page (product grid, hero, filters, pagination)
├── product.html    ← Product detail page (product.html?id=N)
├── cart.html       ← Shopping cart
├── wishlist.html   ← Saved items (wishlist)
├── checkout.html   ← Checkout form + order summary
├── style.css       ← All styles (CSS variables, responsive, animations)
├── script.js       ← All logic (products, cart, wishlist, pagination, search)
├── products.json   ← Product data (25 items)
└── Brand_logo.jpg  ← Zyrova logo (put your logo file here)
```

---

## 🚀 How to Run Locally

**Important:** Because `products.json` is loaded via `fetch()`, you must serve the
files from a local HTTP server (not by opening index.html directly as a `file://` URL).

### Option 1 — Python (no install needed)
```bash
cd zyrova
python3 -m http.server 8080
# Then open: http://localhost:8080
```

### Option 2 — Node.js / npx
```bash
cd zyrova
npx serve .
# Or: npx http-server .
```

### Option 3 — VS Code Live Server
Install the "Live Server" extension in VS Code, right-click `index.html` → "Open with Live Server".

---

## 🎨 Design System

| Token          | Value        |
|----------------|--------------|
| Background     | `#090909`    |
| Surface        | `#111111`    |
| Accent Blue    | `#2563eb`    |
| Text           | `#ffffff`    |
| Text Muted     | `#888888`    |
| Display Font   | Syne         |
| Body Font      | Outfit       |

---

## ✨ Features

- ✅ Dynamic product loading from `products.json`
- ✅ Category filtering + full-text search
- ✅ Pagination (10 products/page)
- ✅ Product detail page with quantity selector
- ✅ Cart with quantity controls, item removal, totals
- ✅ Wishlist with heart toggle
- ✅ Checkout form with basic validation
- ✅ localStorage persistence for cart & wishlist
- ✅ Toast notifications
- ✅ Star ratings
- ✅ Fully responsive (mobile + desktop)
- ✅ Smooth hover/transition animations
- ✅ Accessible (ARIA labels, semantic HTML)

---

## 🛒 Adding Products

Edit `products.json`. Each product needs:
```json
{
  "id": 26,
  "name": "Your Product Name",
  "description": "Short description here.",
  "price": 199.99,
  "category": "Audio",
  "image": "https://your-image-url.com/image.jpg",
  "rating": 4.5
}
```

---

## 📱 Browser Support

Works in all modern browsers: Chrome, Firefox, Safari, Edge.
No build tools or dependencies required.
