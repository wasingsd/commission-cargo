# Commission Cargo

ระบบคำนวณค่าคอมมิชชั่นสำหรับธุรกิจขนส่งสินค้า

## 🚀 Features

- **ตั้งค่าเรททุน**: จัดการเรทราคาทุนแยกตามประเภทสินค้า + ช่องทาง (รถ/เรือ) + หน่วย (CBM/KG)
- **รายการขนส่ง**: บันทึกรายการขนส่งทีละแถว หรือ Import CSV
- **คำนวณต้นทุนอัตโนมัติ**: 
  - `cost_cbm = cbm × rate_cbm`
  - `cost_kg = kg × rate_kg`
  - `cost_final = max(cost_cbm, cost_kg)` หรือ Manual
- **คำนวณค่าคอมมิชชั่น**:
  - ถ้า `sell ≠ cost`: ค่าคอม = `sell - cost`
  - ถ้า `sell = cost`: ค่าคอม = `sell × 1%`
- **สรุปค่าคอม**: รายลูกค้า / รายเซลล์ / รายเดือน
- **Import/Export CSV**: รองรับการนำเข้าและส่งออกข้อมูล
- **Audit Log**: บันทึกทุกการเปลี่ยนแปลงเรทและรายการ
- **Rate Versioning**: เก็บประวัติเรทและรองรับการคำนวณย้อนหลัง

## 🛠 Tech Stack

- **Frontend**: Next.js 14 + TypeScript + React
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js
- **Styling**: Vanilla CSS (Premium Modern Design)

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup Steps

1. **Clone the project**
```bash
git clone <repository-url>
cd commission-cargo
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Copy the example file
cp .env.example .env

# Edit .env and set your PostgreSQL connection string
# DATABASE_URL="postgresql://username:password@localhost:5432/commission_cargo"
```

4. **Setup database**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed initial data (optional)
npx prisma db seed
```

5. **Start development server**
```bash
npm run dev
```

6. **Open the app**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
commission-cargo/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── rate-cards/
│   │   │   ├── shipments/
│   │   │   ├── audit-logs/
│   │   │   └── reports/
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main page
│   └── lib/
│       ├── prisma.ts      # Prisma client
│       ├── calc.ts        # Calculation functions
│       ├── types.ts       # TypeScript types
│       ├── api.ts         # API client
│       ├── csv.ts         # CSV utilities
│       └── permissions.ts # RBAC utilities
└── docs/
    └── database-seed.md   # Seed documentation
```

## 🔑 User Roles

| Role    | Description                                    |
|---------|------------------------------------------------|
| ADMIN   | Full access to all features                    |
| MANAGER | Can manage rates, shipments, and view reports  |
| STAFF   | Can manage shipments and view summaries        |
| SALE    | Can view and edit own shipments only           |

## 📊 API Endpoints

### Rate Cards
- `GET /api/rate-cards` - List all rate cards
- `POST /api/rate-cards` - Create new rate card
- `GET /api/rate-cards/:id` - Get rate card by ID
- `PATCH /api/rate-cards/:id` - Update rate card
- `POST /api/rate-cards/:id/activate` - Activate rate card

### Shipments
- `GET /api/shipments` - List shipments with filters
- `POST /api/shipments` - Create new shipment
- `GET /api/shipments/:id` - Get shipment by ID
- `PATCH /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment
- `POST /api/shipments/recalculate` - Recalculate shipments

### Reports
- `GET /api/reports/summary` - Get commission summaries

### Audit Logs
- `GET /api/audit-logs` - List audit logs with filters

## 💡 Business Logic

### Cost Calculation (AUTO mode)
```typescript
cost_cbm = cbm × rate_cbm
cost_kg = kg × rate_kg
cost_final = max(cost_cbm, cost_kg)
```

### Commission Calculation
```typescript
if (sell == cost) {
  commission = sell × 1%    // ONEPCT method
} else {
  commission = sell - cost  // DIFF method
}
```

## 🔄 Rate Versioning Policy

The system supports two policies for handling rate changes:

### Policy A (Recommended) - Lock Rate per Shipment
- Each shipment locks the rate card used at creation time
- Rate changes only affect new shipments
- Use "Recalculate" feature to apply new rates to existing shipments

### Policy B - Always Use Latest Rate
- All shipments use the currently active rate card
- Rate changes automatically recalculate all shipments
- May cause historical data to change

## 📋 CSV Import Template

```csv
date_in,customer_code,sales_code,sales_name,tracking_no,product_type,transport,weight_kg,cbm,cost_mode,cost_manual,sell_base,note
2026-01-09,PR-001,S-01,สมชาย,7100123456,ทั่วไป,รถ,50,0.5,AUTO,,3500,
```

## 🎨 Design System

The application uses a premium modern design with:
- Custom CSS variables for colors, spacing, and typography
- Responsive layout with sidebar navigation
- Glassmorphism and gradient effects
- Smooth animations and transitions
- Thai language support with Google Fonts (Inter + Noto Sans Thai)

## 📝 License

MIT License

## 👥 Contributors

- Commission Cargo Team
