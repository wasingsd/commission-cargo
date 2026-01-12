# Commission Cargo - Quick Start Guide

## 🚀 Getting Started

### 1. Database Setup (First Time Only)

#### A. Start Local Database (Via Docker)
If you don't have a local Postgres running:
```bash
docker-compose up -d
```
*Wait 10-20 seconds for DB to initialize.*

#### B. Initialize Schema & Data
```bash
# Push schema to database
npx prisma db push

# Seed initial data (Creates default users & rates)
npx prisma db seed
```

### 1.1 Default Credentials
- **Admin**: `admin@prcargo.com` / `password123`
- **Manager**: `manager@prcargo.com` / `password123`

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📋 User Flow

### Step 1: Create Your First Rate Card
1. Navigate to **Rates** (`/rates`)
2. Click **"New Rate Card"**
3. Enter a name (e.g., "January 2026 Rates")
4. Fill in the **Rate Matrix**:
   - **Product Types**: General, TISI, FDA, Special
   - **Transport**: Ship (CBM/KG) and Truck (CBM/KG)
   - Example: TISI Truck → CBM: 6000, KG: 26
5. Click **"Save Changes"**
6. Click **"Set Active"** to make this the default rate card

### Step 2: Create a Shipment
1. Navigate to **Shipments** (`/shipments`)
2. Click **"New Shipment"**
3. Fill in the form:
   - **Date In**: Today's date
   - **Customer**: e.g., "PR-001"
   - **Tracking No**: e.g., "710062350068" or "710062350068-1" (with suffix)
   - **Product Type**: Select from dropdown
   - **Transport**: Choose Truck or Ship
   - **Weight (KG)**: e.g., 100
   - **Volume (CBM)**: e.g., 0.5

4. **Watch the Magic** ✨:
   - The system automatically calculates:
     - Cost by CBM = 0.5 × Rate(CBM)
     - Cost by KG = 100 × Rate(KG)
     - **Final Cost** = Higher of the two
   - Preview shows which rule applies (CBM or KG)

5. Enter **Sell Price (Base)**
6. If Sell < Cost, you'll see a **warning**
7. Click **"Create Shipment"**

### Step 3: View Dashboard
1. Navigate to **Dashboard** (`/`)
2. See:
   - **Total Commission**, Sales, Cost
   - **Commission Mix** (Pie Chart): DIFF vs 1%
   - **Monthly Performance** (Bar Chart)
   - **Risk Alerts**: Shipments where Sell < Cost

---

## 🎯 Key Features

### Real-Time Cost Calculation
- As you type Weight/CBM, the form instantly shows:
  - Cost by CBM
  - Cost by KG
  - Which one is higher (and will be used)

### Manual Override
- Toggle **"Manual"** mode to enter a custom cost
- Useful for special deals or negotiations

### Tracking Number Intelligence
- System detects suffixes like `-1`, `-2`
- Helps identify duplicate base tracking numbers

### Commission Logic
- **DIFF Mode**: Commission = Sell - Cost
- **1% Mode**: Commission = 1% × Sell (when Sell = Cost)
- **Loss Detection**: Flags when Sell < Cost

---

## 🔧 Troubleshooting

### "No Active Rate Card" Warning
- Go to `/rates` and click **"Set Active"** on a rate card
- Only one card can be active at a time

### Cost Shows as 0
- Make sure you've entered either Weight OR CBM
- Check that the active rate card has rates for your selected Product Type

### Database Connection Error
- Verify `DATABASE_URL` in `.env` is correct
- Run `npx prisma db push` to sync schema

---

## 📊 Understanding the Dashboard

### KPI Cards
- **Total Commission**: Sum of all commissions
- **Total Sales**: Sum of all Sell Base values
- **Total Cost**: Sum of all Final Costs
- **Shipments**: Total count

### Commission Mix (Pie Chart)
- Shows distribution between:
  - **DIFF**: Normal profit-based commission
  - **1%**: Minimum commission (when Sell = Cost)

### Monthly Performance (Bar Chart)
- Stacked bars showing DIFF + 1% per month
- Helps track trends over time

### Risk Alerts
- Lists shipments where **Sell < Cost**
- Critical for identifying unprofitable deals

---

## 🎨 Design Philosophy

This system follows the **"Wow First"** principle:
- **Instant Feedback**: See calculations as you type
- **Visual Clarity**: Color-coded status badges
- **Premium Feel**: Smooth animations and glassmorphism

---

## 🚢 Next Steps

1. **Seed More Data**: Run `npx prisma db seed` to add sample shipments
2. **Deploy**: Push to Vercel/Netlify for production
3. **Customize**: Adjust rates and product types as needed

Happy shipping! 🎉
