# 📦 Endang Stock Backend

## 📖 Description (Deskripsi)

**English:**
Endang Stock Backend is a robust stock and inventory management API built with Node.js, Express, and TypeScript. It is designed to manage multiple stores, warehouses, products, and handle complex stock transactions such as stock-in, stock-out, and stock mutations (transfers). It features a role-based authentication system to ensure secure access.

**Bahasa Indonesia:**
Endang Stock Backend adalah API manajemen stok dan inventaris yang kuat yang dibangun menggunakan Node.js, Express, dan TypeScript. Sistem ini dirancang untuk mengelola berbagai toko, gudang, produk, serta menangani transaksi stok yang kompleks seperti barang masuk (stock-in), barang keluar (stock-out), dan mutasi stok (transfer antar cabang). Sistem ini juga dilengkapi dengan sistem autentikasi berbasis peran (Role-Based Access Control) untuk memastikan keamanan akses data.

---

## 🚀 Tech Stack (Teknologi yang Digunakan)

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL (with Supabase)
- **Real-time:** Socket.io
- **Authentication:** JSON Web Token (JWT) & bcryptjs
- **File Upload:** Multer
- **Logging:** Winston
- **Date Formatting:** date-fns

---

## ✨ Features (Fitur)

**English:**
- **User Authentication & Authorization:** Secure login with JWT and Role-Based Access Control (RBAC) supporting dynamic JSON permissions.
- **Product Management:** Manage products along with their categories, brands, and units. Includes low stock threshold tracking.
- **Store & Warehouse Management:** Seamlessly manage inventory across multiple physical stores and a central warehouse.
- **Stock Tracking (Inventory):** Track stock levels (Store Stock and Warehouse Stock) and automatically manage product status (`available`, `lowStock`, `outOfStock`).
- **Stock Transactions:**
  - **Stock In:** Record incoming products to stores or the central warehouse.
  - **Stock Out:** Record outgoing products from stores.
  - **Stock Mutation:** Transfer products between stores or from the central warehouse to a specific store.
- **Transaction Status Tracking:** Track the status of stock operations (e.g., `pending`, `completed`).
- **Real-time Updates:** Integrated with Socket.io for real-time notifications and updates.
- **File Uploads:** Support for uploading user profile photos or other assets via Multer.

**Bahasa Indonesia:**
- **Autentikasi & Otorisasi Pengguna:** Login aman menggunakan JWT dan Role-Based Access Control (RBAC) dengan hak akses berbasis JSON yang fleksibel.
- **Manajemen Produk:** Mengelola produk beserta kategori, merek (brand), dan satuan (unit). Termasuk pelacakan batas minimum stok.
- **Manajemen Toko & Gudang:** Mengelola inventaris secara terpusat di berbagai toko fisik dan gudang utama.
- **Pelacakan Stok (Inventaris):** Melacak jumlah stok (Stok Toko dan Stok Gudang) serta memperbarui status produk secara otomatis (`available`, `lowStock`, `outOfStock`).
- **Transaksi Stok:**
  - **Stok Masuk (Stock In):** Mencatat barang yang masuk ke toko atau gudang pusat.
  - **Stok Keluar (Stock Out):** Mencatat barang yang keluar dari toko.
  - **Mutasi Stok (Stock Mutation):** Memindahkan/transfer barang antar toko atau dari gudang pusat ke toko tertentu.
- **Pelacakan Status Transaksi:** Memonitor status operasional stok (contoh: `pending` atau `completed`).
- **Pembaruan Real-time:** Terintegrasi dengan Socket.io untuk pengiriman data dan notifikasi secara langsung (real-time).
- **Unggah File (File Uploads):** Dukungan untuk mengunggah foto profil pengguna atau file lainnya menggunakan Multer.
