# Commission Cargo - Database Seeding Script

## How to Seed the Database

1. First, make sure your PostgreSQL database is running and the DATABASE_URL is configured in .env

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Run migrations:
```bash
npx prisma migrate dev --name init
```

4. Seed the database using the seed script:
```bash
npx prisma db seed
```

## Manual Seeding via Prisma Studio

Alternatively, you can add data manually:
```bash
npx prisma studio
```

## Sample Data Structure

### Users
- Admin: admin@commission-cargo.com (role: ADMIN)
- Manager: manager@commission-cargo.com (role: MANAGER)
- Staff: staff@commission-cargo.com (role: STAFF)

### Salespeople
- S-01: สมชาย ใจดี
- S-02: สมหญิง รักงาน
- S-03: ประยุทธ์ ขยัน

### Customers
- PR-001: บริษัท เพชรรุ่ง จำกัด
- PR-002: ห้างหุ้นส่วน เจริญทอง
- PR-003: บริษัท สยามสตาร์ จำกัด

### Rate Cards
Default rate card with rates for all product types and transport methods.
