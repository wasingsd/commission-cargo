# PR Cargo – Doc Logic การทำงาน (Step-by-step)

เอกสารนี้เขียนเพื่อใช้เป็น “คู่มือ logic” สำหรับ

* เทรน AI/บอท (ให้ตอบ/ตัดสินใจตรงกัน)
* ออกแบบ UX/UI (หน้าบ้าน) และกติกาหลังบ้าน (backend)

> ขอบเขตหลักของเอกสารนี้อิงจากเวอร์ชันล่าสุดของระบบ **Commission Calculator** ที่คุณทำไว้ (มีเรทต้นทุน, Auto/Manual cost, DIFF vs 1%, CSV Import/Export, Log, และ tracking ที่มี -1/-2 หมายถึง “เลขซ้ำหลายกล่อง”)

---

## 1) เป้าหมายระบบ (Objectives)

1. บันทึกรายการพัสดุ/งานขนส่งของลูกค้าได้ง่ายและเร็ว
2. คำนวณ **ต้นทุนต่อรายการ** ให้เป็นมาตรฐานเดียวกัน (Auto ตามเรท หรือ Manual)
3. คำนวณ **ค่าคอมเซลล์** ด้วยกติกาที่ชัดเจน
4. จัดการกรณี **Tracking ซ้ำหลายกล่อง** ด้วย suffix `-1/-2/...` อย่างถูกต้อง
5. สรุปยอดรายเดือน/รายลูกค้า/รายเซลล์ พร้อมตรวจความเสี่ยง (Sell < Cost / ข้อมูลไม่ครบ)
6. รองรับการใช้งานจริงด้วย CSV Import/Export + Template
7. มี Log เพื่อ audit (ใครทำอะไร เปลี่ยนเรทเมื่อไหร่)

---

## 2) บทบาทผู้ใช้งาน (Roles)

### 2.1 Admin (หลังบ้าน)

* ตั้งค่าเรทต้นทุน (ตามประเภทสินค้า × ช่องทางขนส่ง)
* ตรวจรายการผิดปกติ (Sell < Cost / Missing Cost / Tracking ซ้ำ)
* Import/Export CSV และตรวจความถูกต้อง
* สรุปยอดเพื่อจ่ายค่าคอม/ทำรายงาน

### 2.2 Sales

* บันทึกรายการของลูกค้า (customer, tracking, น้ำหนัก/CBM, sell base)
* ตรวจค่าคอมตัวเองจากระบบ (ตามช่วงเดือน)
* แจ้งแก้ไขข้อมูลที่ผิด (เช่น tracking, kg/cbm, sell base)

### 2.3 Manager/Owner (ผู้ดูภาพรวม)

* ดู Dashboard, สรุปยอด, แนวโน้มรายเดือน
* ตรวจเรทและผลกระทบเมื่อปรับเรท

---

## 3) โครงสร้างข้อมูลหลัก (Data Model)

### 3.1 RateRow (เรทราคาทุน)

* `type` (ProductType): `ทั่วไป | มอก | อย | พิเศษ`
* `ship_cbm` : บาท/คิว (เรือ)
* `ship_kg` : บาท/กก. (เรือ)
* `truck_cbm` : บาท/คิว (รถ)
* `truck_kg` : บาท/กก. (รถ)

### 3.2 Shipment/Commission Row (รายการ)

**Input fields**

* `date_in` : วันที่เข้าโกดัง
* `customer_code` : รหัสลูกค้า (เช่น PR-014)
* `sales_code` : รหัสเซลล์ (เช่น S-01)
* `sales_name` : ชื่อเซลล์
* `tracking_no` : เลขแทรค (เช่น 710062350068-1)
* `product_type` : ประเภทสินค้า
* `transport` : `รถ | เรือ`
* `weight_kg` : น้ำหนัก (ยอมรับทศนิยม)
* `cbm` : CBM (ยอมรับทศนิยม)
* `use_auto_cost` : true/false
* `cost_manual` : ต้นทุน manual (ใช้เมื่อ auto=false)
* `sell_base` : ราคาขายฐาน (ตัวตั้งคำนวณคอม)
* `note` : หมายเหตุ

**Computed fields (ระบบคำนวณให้)**

* `month` : YYYY-MM (จาก date_in)
* `tracking_base` : base ก่อนขีดสุดท้าย
* `tracking_suffix` : ค่าหลังขีด (ตัวเลข)
* `tracking_has_suffix` : true เมื่อมี -n และ n เป็นตัวเลข >= 0
* `cost_cbm` : cbm × rate_cbm
* `cost_kg` : kg × rate_kg
* `cost_final` : max(cost_cbm, cost_kg) หรือ manual
* `cost_rule` : `CBM | KG | MANUAL | ''`
* `commission_method` : `DIFF | 1% | ''`
* `commission` : จำนวนเงินค่าคอม
* `flag` : `OK | 1% | Sell<Cost | MISSING_COST | ''`

---

## 4) กติกา Tracking (-1/-2 = เลขซ้ำหลายกล่อง)

### 4.1 นิยาม

* ถ้า tracking มีรูปแบบ `BASE-N` และ `N` เป็นตัวเลข (>=0)

  * ถือว่า **เป็นเลข tracking base เดียวกัน แต่เป็นกล่องคนละใบ**
  * `BASE` = tracking_base
  * `N` = tracking_suffix

**ตัวอย่าง**

* 710062350068
* 710062350068-1
* 710062350068-2

> หมายเหตุสำคัญ: `-1` **ไม่ใช่จำนวนชิ้น** แต่เป็นตัวบอกว่า “เลขซ้ำหลายกล่อง”

### 4.2 Rule การแยก base/suffix

1. หาตำแหน่งขีด `-` ตัวสุดท้าย
2. ถ้าไม่มีขีด → base = tracking ทั้งหมด, hasSuffix=false
3. ถ้ามีขีด → ลอง parse ส่วนหลังขีดเป็นตัวเลข

   * ถ้า parse ได้และ >= 0 → hasSuffix=true, base=ก่อนขีด, suffix=ตัวเลข
   * ถ้า parse ไม่ได้ → ถือว่าไม่มี suffix (hasSuffix=false) และ base=tracking ทั้งหมด

### 4.3 การตรวจ “tracking base ซ้ำ”

* นับจำนวนรายการที่มี `tracking_base` เดียวกัน (เฉพาะในชุดข้อมูลที่กำลังดู/filtered)
* ถ้า base ใดมี count >= 2 → โชว์เป็น “Tracking Base ซ้ำ”
* จุดประสงค์: เตือนว่า

  * อาจจะต้องมี `-1/-2` ให้ครบ
  * หรืออาจพิมพ์ tracking ซ้ำผิด

---

## 5) Logic คำนวณต้นทุน (Cost) แบบ Step-by-step

### 5.1 Input ที่ต้องใช้

* `product_type`
* `transport`
* `weight_kg`
* `cbm`
* `use_auto_cost`
* `cost_manual` (ใช้เมื่อ auto=false)

### 5.2 ขั้นตอนคำนวณ

#### A) ถ้า `use_auto_cost = false` (Manual)

1. อ่านค่า `cost_manual`
2. `cost_final = round2(cost_manual)`
3. `cost_rule = 'MANUAL'` ถ้า manual > 0 ไม่งั้นเป็นค่าว่าง

#### B) ถ้า `use_auto_cost = true` (Auto)

1. หาเรทจาก `ratesMap[product_type]`

   * ถ้าไม่พบเรท → cost_final = 0, cost_rule='' และ `missingAutoInputs=true`
2. ตรวจ input อย่างน้อยหนึ่งค่า

   * ถ้า `weight_kg <= 0` และ `cbm <= 0` → ยังคิดไม่ได้ (missing)
3. เลือกเรทตาม transport

   * ถ้า `transport='รถ'` → ใช้ `truck_cbm` และ `truck_kg`
   * ถ้า `transport='เรือ'` → ใช้ `ship_cbm` และ `ship_kg`
4. คำนวณ

   * `cost_cbm = round2(cbm * rate_cbm)`
   * `cost_kg  = round2(weight_kg * rate_kg)`
5. เลือกค่าที่สูงกว่า

   * ถ้า cost_cbm >= cost_kg → `cost_final=cost_cbm`, `cost_rule='CBM'`
   * ถ้า cost_kg > cost_cbm → `cost_final=cost_kg`, `cost_rule='KG'`

### 5.3 Preview เพื่อ UX

* ถ้า manual → โชว์ “Manual”
* ถ้า auto แต่ kg และ cbm เป็น 0 ทั้งคู่ → โชว์ “ต้องใส่ น้ำหนัก/CBM อย่างน้อย 1 ค่า”
* ถ้า auto คิดได้ → โชว์

  * `CBM: xxx | KG: yyy → เลือก CBM/KG`

---

## 6) Logic คำนวณค่าคอม (Commission) แบบ Step-by-step

### 6.1 ตัวแปร

* `sell_base` (Sell_Base)
* `cost_final`
* `cost_ready` =

  * ถ้า auto: ต้องมี kg หรือ cbm อย่างน้อย 1 ค่า (ไม่ missing)
  * ถ้า manual: ถือว่าพร้อมเสมอ

### 6.2 กติกา (ตามระบบล่าสุด)

1. ถ้า `cost_ready=false` → ไม่คิดค่าคอม (method='', commission=0, flag=MISSING_COST เมื่อ sell_base>0)
2. ถ้า `sell_base == 0` และ `cost_final == 0` → ถือว่าแถวว่าง (method='', commission=0)
3. ถ้า `sell_base === cost_final` → method='1%', commission = 1% × sell_base
4. ถ้า `sell_base !== cost_final` → method='DIFF', commission = sell_base - cost_final

### 6.3 Flag (สถานะ)

* ถ้า missing และ sell_base>0 → `MISSING_COST`
* ถ้า sell_base < cost_final → `Sell<Cost`
* ถ้า sell_base === cost_final → `1%`
* ถ้า sell_base > cost_final → `OK`

> หมายเหตุ: กรณี Sell < Cost ระบบยังคำนวณ commission เป็นค่าติดลบได้ตามสูตร (เพื่อเตือน) แต่ UX ควร “ไฮไลต์แดง” และให้ admin ตรวจ

---

## 7) Logic Filter/สรุปผล (Summary)

### 7.1 Filters

* เดือน (month) : all หรือ YYYY-MM
* ลูกค้า (customer_code)
* เซลล์ (sales_code + sales_name)

### 7.2 Totals (คำนวณบนชุด filtered)

* `totalCommission` = sum(commission)
* `diffCommission` = sum(commission where method=DIFF)
* `onePctCommission` = sum(commission where method=1%)
* `shipments` = จำนวนรายการที่มี tracking ไม่ว่าง
* `sellTotal` = sum(sell_base)
* `costTotal` = sum(cost_final)
* `sellBelowCost` = count(flag=Sell<Cost)
* `missingCost` = count(flag=MISSING_COST)

### 7.3 Summary Tables

* Summary by customer

  * DIFF / 1% / Total / Shipments / Missing
* Summary by salesman

  * DIFF / 1% / Total / Shipments / Missing

### 7.4 Dashboard

* Pie (DIFF vs 1%)
* Bar รายเดือน (stacked DIFF + 1%)
* Risk panels

  * Sell<Cost list
  * Tracking base ซ้ำ list

---

## 8) CSV Import/Export (Logic และข้อควรระวัง)

### 8.1 Template (ไฟล์ตั้งต้น)

* ต้องมี header ตรงกัน:

  * `date_in,customer_code,sales_code,sales_name,tracking_no,product_type,transport,weight_kg,cbm,use_auto_cost,cost_manual,sell_base,note`

### 8.2 Import – Step-by-step

1. อ่านไฟล์เป็น text
2. แยกบรรทัด (trim และตัดบรรทัดว่าง)
3. อ่าน header → map index ของแต่ละคอลัมน์
4. อ่านข้อมูลทีละบรรทัด → สร้าง Row
5. normalize ค่า

   * product_type ไม่ตรง → default เป็น “ทั่วไป”
   * transport เขียน “ทางรถ/ทางเรือ” → normalize เป็น “รถ/เรือ”
   * use_auto_cost: true/1/yes/y → true
6. สร้าง id ใหม่ทุกแถว
7. ส่งผ่าน computeRow เพื่อเติม computed fields
8. แทนที่ชุดข้อมูลเดิมทั้งหมด (หรือในอนาคตอาจเลือก merge)
9. reset filters เป็น all
10. เขียน Log: Import สำเร็จ/ไม่สำเร็จ

### 8.3 Export – Step-by-step

1. สร้าง CSV header (รวม computed fields ที่จำเป็น เช่น cost_final, method, flag)
2. แปลงค่าตัวเลขเป็น number (parseNumber)
3. sanitize ข้อความที่มี comma (แทนด้วย space)
4. join เป็น \n

---

## 9) Log/Audit (Logic)

### 9.1 เหตุการณ์ที่ควร Log

* เริ่มระบบ
* Import CSV
* Export CSV
* ดาวน์โหลด/คัดลอก Template
* เพิ่ม/ลบรายการ
* ปรับเรทราคาทุน (สำคัญมาก เพราะกระทบรายการเก่า)
* (แนะนำเพิ่มในอนาคต) แก้ไขรายการ (row updated) แบบสรุป field ที่เปลี่ยน

### 9.2 รูปแบบ LogEntry

* `ts` เวลา
* `level` INFO/WARN/ERROR
* `title` ชื่อเหตุการณ์
* `detail` รายละเอียด

---

## 10) UX Flow ที่แนะนำ (Frontend)

### 10.1 Flow: บันทึกรายการ 1 รายการ (Sales/Admin)

1. เปิดแท็บ Input
2. กด “เพิ่มรายการ”
3. กรอกขั้นต่ำที่ควรบังคับ (แนะนำ)

   * date_in
   * customer_code
   * sales_code / sales_name
   * tracking_no
   * product_type
   * transport
   * ใส่ weight_kg หรือ cbm อย่างน้อย 1 ค่า (ถ้าเลือก Auto)
   * sell_base
4. ระบบโชว์

   * Base/Suffix ของ tracking
   * Preview cost (CBM vs KG)
   * cost_final / method / commission / flag
5. ถ้า flag = MISSING_COST → ให้ UX แจ้ง “ใส่ kg หรือ CBM ก่อน”
6. ถ้า flag = Sell<Cost → เตือนสีแดง “ตรวจราคา/เรท”

### 10.2 Flow: ปรับเรทต้นทุน (Admin)

1. เปิดแท็บ ตั้งค่าราคาทุน
2. แก้ค่าเรทในช่องตาราง
3. ระบบ

   * recompute rows ทั้งหมดทันที
   * เขียน Log: ปรับเรท + รายการเก่าปรับตาม
4. UX แนะนำ

   * ปุ่ม “บันทึก/ยืนยัน” ก่อน apply (ถ้าไม่อยากให้ recalculation ทันที)
   * หรือทำเวอร์ชัน “Draft rates” และ “Publish rates”

### 10.3 Flow: สรุปค่าคอมสิ้นเดือน (Manager/Admin)

1. เลือก Filter เดือน
2. เปิด Summary / Dashboard
3. ตรวจ

   * Missing Cost
   * Sell<Cost
   * Tracking base ซ้ำ
4. Export CSV เพื่อส่งบัญชี/จ่ายค่าคอม

---

## 11) Validation & Edge Cases (สำหรับเทรน AI/ออกแบบ UX)

### 11.1 Tracking

* ถ้า tracking เป็น `ABC-DEF` (suffix ไม่ใช่ตัวเลข) → ไม่ถือว่าเป็น -n
* ถ้า tracking เป็น `-1` (ไม่มี base) → ควรถือว่า invalid
* ถ้า tracking มีช่องว่าง/คอมม่า → trim และ sanitize

### 11.2 ตัวเลข

* รองรับ `1,234.56`
* ช่องว่าง → 0
* ค่าติดลบ → แนะนำบล็อกใน UX (ยกเว้นกรณีแก้ไขพิเศษ)

### 11.3 Auto cost

* ถ้า kg=0 และ cbm=0 → missing
* ถ้าใส่แค่ cbm (kg=0) → cost_kg=0, cost_cbm>0 → เลือก CBM
* ถ้าใส่แค่ kg (cbm=0) → cost_cbm=0, cost_kg>0 → เลือก KG

### 11.4 Commission

* Sell=Cost → 1%
* Sell<Cost → flag แดง, ควรให้ manager ตรวจ
* Sell=0 แต่ cost>0 → ถือเป็นข้อมูลผิด (แนะนำเพิ่ม flag ใหม่ เช่น `MISSING_SELL`)

---

## 12) Backend Structure (แนะนำสำหรับการเริ่ม Dev จริง)

> ถ้าจะพัฒนาให้ใช้งานจริงหลายคน + มีสิทธิ์ + มีประวัติแก้ไข แนะนำแยกเป็น **Frontend + API + DB**

### 12.1 Tech Stack ที่แนะนำ (ทางเลือก A ที่ใช้งานง่ายและนิยม)

* Frontend: **Next.js (React + TypeScript)**
* Backend/API: **Next.js API Routes** หรือแยกเป็น **NestJS**
* DB: **PostgreSQL**
* ORM: **Prisma**
* Auth: **NextAuth** (หรือ Clerk)
* Hosting: Vercel (FE) + Supabase/Neon (DB)

### 12.2 โครงสร้างตารางฐานข้อมูล (ตัวอย่าง)

* `users` (role: admin/sales/manager)
* `rates` (versioning แนะนำ: rate_set_id)
* `shipments` (row data)
* `shipment_audit_logs` (เก็บ diff เวลาแก้ไข)
* `system_logs` (เหมือน UI log)

### 12.3 API Endpoints (ตัวอย่าง)

* `GET /rates` / `PUT /rates` (admin)
* `GET /shipments?month=&customer=&sales=`
* `POST /shipments` (create)
* `PUT /shipments/:id` (update)
* `DELETE /shipments/:id`
* `POST /shipments/import` (csv)
* `GET /shipments/export` (csv)
* `GET /reports/summary` (customer/sales/month)

### 12.4 หลักการสำคัญ (เพื่อให้ตัวเลขตรงกันทุกที่)

* ให้ backend เป็น “source of truth” ในการคำนวณ (computeRow/computeCost)
* Frontend แค่แสดง preview และส่ง input
* เวลาปรับเรท ให้สร้าง “rate set” ใหม่ (version) เพื่อ trace ได้ว่าเดือนนั้นใช้เรทชุดไหน

---

## 13) โมดูลเสริม: Logic สำหรับ AI/แอดมินตอบแชตเรื่อง Tracking (สั้นแต่ใช้งานจริง)

### 13.1 Intent: ลูกค้าถาม “เลขแทรค/ตามของ”

**Step-by-step**

1. รับข้อความลูกค้า
2. ตรวจว่ามีเลข tracking ในข้อความไหม
3. ถ้าเจอ tracking ที่มี `-n` → อธิบายสั้น ๆ ว่าเป็นเลขซ้ำหลายกล่อง ไม่ใช่จำนวนชิ้น
4. Normalize tracking_base เพื่อค้นในระบบ (ถ้าลูกค้าพิมพ์ base มาเฉย ๆ)
5. ค้นรายการที่ tracking_base เดียวกัน
6. ตอบลูกค้าเป็น list:

   * base + ทุก suffix ที่มี (รวม base แบบไม่มี -n ถ้ามี)
   * สถานะล่าสุดของแต่ละกล่อง (ถ้าระบบมี status)
7. ถ้าค้นไม่เจอ → ขอข้อมูลเพิ่มอย่างสุภาพ

   * รหัสลูกค้า/วันที่ส่ง/ชื่อผู้รับ

### 13.2 ตัวอย่างข้อความมาตรฐาน (สั้น)

* “เลขที่ลงท้าย -1/-2 หมายถึง **กล่องซ้ำกันหลายใบ** ของเลขแทรคเดียวกันนะครับ/ค่ะ ไม่ได้หมายถึงจำนวนชิ้นค่ะ”

---

## 14) Checklist สำหรับนำไปออกแบบ UX/UI

* [ ] ช่องกรอกหลักต้อง “กรอกเร็ว” (auto-focus, tab order ดี)
* [ ] แสดง Preview cost ทันทีเมื่อกรอก kg/cbm
* [ ] Highlight สีสำหรับ MISSING_COST / Sell<Cost
* [ ] มี Filter ที่ใช้งานง่าย (เดือน/ลูกค้า/เซลล์)
* [ ] Summary แยก customer และ sales
* [ ] Dashboard มี Risk block ชัด
* [ ] Import/Export มีข้อความบอกไฟล์ต้องเป็น header ไหน
* [ ] Log ต้องอ่านง่าย และค้นได้ (แนะนำเพิ่ม search ในอนาคต)

---

## 15) ข้อเสนอพัฒนาต่อ (ถ้าจะทำเป็นระบบใช้งานจริง)

1. เพิ่ม field สถานะขนส่ง (warehouse_in, in_transit, delivered, issue)
2. เพิ่มการ “ล็อกเดือน” (close month) เพื่อป้องกันแก้ไขย้อนหลังโดยไม่ตั้งใจ
3. เพิ่ม approval flow: sales ใส่ข้อมูล → admin ตรวจ → manager approve
4. เพิ่ม role-based permission
5. เพิ่ม audit diff ทุกครั้งที่แก้ไขแถว
6. เพิ่ม merge import (ไม่ต้องทับทั้งหมด)

---

