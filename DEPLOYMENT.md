# 🚀 คู่มือการ Deploy - Training Tracker System

## ภาพรวม
- **Frontend**: Vercel (React)
- **Backend**: Render (Node.js + Express)
- **Database**: Render PostgreSQL (ฟรี)

---

## 📋 ขั้นตอนการ Deploy

### **Step 1: เตรียม GitHub Repository**

1. สร้าง GitHub Repository ใหม่
2. Push โค้ดทั้งหมดขึ้น GitHub:

```bash
cd "C:/Users/Anan Hayicheteh/Desktop/Claude Projects/MH Ecampus"
git init
git add .
git commit -m "Initial commit - Training Tracker System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/training-tracker.git
git push -u origin main
```

---

### **Step 2: Deploy Database บน Render**

1. ไปที่ [Render.com](https://render.com) และ Sign up/Login
2. คลิก **New +** → เลือก **PostgreSQL**
3. กรอกข้อมูล:
   - **Name**: `training-tracker-db`
   - **Database**: `training_tracker`
   - **User**: (ใช้ค่า default)
   - **Region**: `Singapore (Southeast Asia)`
   - **Plan**: `Free`
4. คลิก **Create Database**
5. รอจนสถานะเป็น **Available** (ประมาณ 2-3 นาที)
6. **เก็บข้อมูลต่อไปนี้ไว้** (จะใช้ในขั้นตอนถัดไป):
   - **Internal Database URL** (ใช้เชื่อมต่อจาก Backend บน Render)
   - **External Database URL** (ใช้เชื่อมต่อจากเครื่อง Local)

---

### **Step 3: Setup Database Schema**

ต้อง migrate schema และข้อมูลพนักงานเข้า PostgreSQL:

#### **Option A: ใช้ External Database URL (จากเครื่อง Local)**

```bash
# 1. Install PostgreSQL client (ถ้ายังไม่มี)
# Windows: ดาวน์โหลดจาก https://www.postgresql.org/download/windows/

# 2. Connect และสร้าง tables
psql "YOUR_EXTERNAL_DATABASE_URL"

# 3. Run SQL commands:
CREATE TABLE IF NOT EXISTS employees (
  employee_id TEXT PRIMARY KEY,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS training_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('trainer', 'trainee')),
  training_topic TEXT NOT NULL,
  training_date DATE NOT NULL,
  duration_hours REAL NOT NULL,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_training_employee ON training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date);
CREATE INDEX IF NOT EXISTS idx_training_session ON training_records(session_id);
```

#### **Option B: ใช้ Node.js Script (แนะนำ)**

สร้างไฟล์ `backend/migrate.js`:

```javascript
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        employee_id TEXT PRIMARY KEY,
        employee_name TEXT NOT NULL,
        department TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS training_records (
        id SERIAL PRIMARY KEY,
        employee_id TEXT NOT NULL,
        employee_name TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('trainer', 'trainee')),
        training_topic TEXT NOT NULL,
        training_date DATE NOT NULL,
        duration_hours REAL NOT NULL,
        session_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_employee ON training_records(employee_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_date ON training_records(training_date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_training_session ON training_records(session_id);
    `);

    console.log('✅ Database schema created successfully');

    await client.end();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
```

รัน migration:

```bash
cd backend
npm install pg
DATABASE_URL="YOUR_EXTERNAL_DATABASE_URL" node migrate.js
```

---

### **Step 4: Deploy Backend บน Render**

1. กลับไปที่ Render Dashboard
2. คลิก **New +** → เลือก **Web Service**
3. เชื่อมต่อ GitHub Repository
4. กรอกข้อมูล:
   - **Name**: `training-tracker-backend`
   - **Region**: `Singapore (Southeast Asia)`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`

5. **ตั้งค่า Environment Variables**:
   - คลิก **Advanced** → **Add Environment Variable**
   - เพิ่มตัวแปรต่อไปนี้:

   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=[คัดลอกจาก Internal Database URL ของ PostgreSQL]
   FRONTEND_URL=https://your-app.vercel.app
   ```

   > ⚠️ **สำคัญ**: ใช้ **Internal Database URL** ไม่ใช่ External URL

6. คลิก **Create Web Service**
7. รอจน Deploy เสร็จ (ประมาณ 3-5 นาที)
8. **เก็บ Backend URL ไว้**: จะเป็นแบบ `https://training-tracker-backend.onrender.com`

---

### **Step 5: Deploy Frontend บน Vercel**

1. ไปที่ [Vercel.com](https://vercel.com) และ Login ด้วย GitHub
2. คลิก **Add New** → **Project**
3. เลือก Repository `training-tracker`
4. กรอกข้อมูล:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. **ตั้งค่า Environment Variables**:
   - คลิก **Environment Variables**
   - เพิ่ม:
     ```
     REACT_APP_API_URL=https://training-tracker-backend.onrender.com/api
     ```
   > ⚠️ แทนที่ด้วย Backend URL จริงที่คุณได้จาก Step 4

6. คลิก **Deploy**
7. รอจน Deploy เสร็จ (ประมาณ 2-3 นาที)
8. **เก็บ Frontend URL ไว้**: จะเป็นแบบ `https://training-tracker-xyz.vercel.app`

---

### **Step 6: อัพเดท CORS ใน Backend**

1. กลับไปที่ Render Dashboard → เลือก Backend Service
2. ไปที่ **Environment** → แก้ไข `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://training-tracker-xyz.vercel.app
   ```
   > แทนที่ด้วย Frontend URL จริงที่คุณได้จาก Step 5

3. คลิก **Save Changes**
4. Render จะ Deploy ใหม่อัตโนมัติ

---

### **Step 7: Import ข้อมูลพนักงาน**

ใช้ Employee Management หน้าเว็บ:

1. เปิด `https://your-app.vercel.app`
2. ไปที่หน้า **Employee Management**
3. คลิก **+ Add Employee** และเพิ่มพนักงานทีละคน

หรือใช้ API Script:

```bash
# สร้างไฟล์ backend/import-employees.js
const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://training-tracker-backend.onrender.com/api';
const employees = JSON.parse(fs.readFileSync('../employees.json', 'utf8'));

async function importEmployees() {
  for (const emp of employees) {
    try {
      await axios.post(`${API_URL}/employees`, emp);
      console.log(`✅ Added: ${emp.employee_name}`);
    } catch (err) {
      console.error(`❌ Failed: ${emp.employee_name}`, err.response?.data);
    }
  }
}

importEmployees();
```

---

## 🎯 ทดสอบระบบ

1. **ทดสอบ Frontend**: เปิด `https://your-app.vercel.app`
2. **ทดสอบ Backend API**: เปิด `https://training-tracker-backend.onrender.com/api/employees`
3. **ทดสอบ QR Code**:
   - ไปที่หน้า Training Form
   - สแกน QR Code ด้วยมือถือ
   - ควรเปิดฟอร์มได้ปกติ

---

## 🔧 Troubleshooting

### **ปัญหา: CORS Error**
- ตรวจสอบว่า `FRONTEND_URL` ใน Backend ตรงกับ URL จริงของ Vercel
- ลบ `https://` และ trailing slash ออก ใน Backend Environment Variables

### **ปัญหา: Database Connection Failed**
- ตรวจสอบว่าใช้ **Internal Database URL** ใน Backend
- ตรวจสอบว่า Database สถานะเป็น **Available** ใน Render

### **ปัญหา: API Not Found (404)**
- ตรวจสอบว่า `REACT_APP_API_URL` ใน Vercel มี `/api` ต่อท้าย
- Redeploy Frontend หลังจากเปลี่ยน Environment Variable

### **ปัญหา: Free Plan Sleep**
- Render Free Plan จะ sleep หลังไม่ได้ใช้งาน 15 นาที
- Request แรกจะใช้เวลา 30-60 วินาที (cold start)
- พิจารณา upgrade เป็น Paid Plan ($7/month) ถ้าต้องการ uptime 100%

---

## 📱 QR Code สำหรับพนักงาน

สร้าง QR Code ที่ชี้ไปที่:
```
https://your-app.vercel.app/training-form
```

ใช้เครื่องมือ:
- [QR Code Generator](https://www.qr-code-generator.com/)
- [QRCode Monkey](https://www.qrcode-monkey.com/)

พิมพ์ QR Code ติดที่จุดต่างๆ เพื่อให้พนักงานสแกนและกรอกฟอร์มได้ง่าย

---

## 💰 ค่าใช้จ่าย

- **Render PostgreSQL Free**: 90 วัน (หลังจากนั้น $7/month)
- **Render Web Service Free**: 750 hours/month (เพียงพอสำหรับ 1 service)
- **Vercel Free**: Unlimited deployments + bandwidth

**รวมฟรีทั้งหมด 90 วัน** จากนั้นจ่าย $7/month สำหรับ Database

---

## 🔄 อัพเดทโค้ด

เมื่อมีการแก้ไขโค้ด:

```bash
# Push ขึ้น GitHub
git add .
git commit -m "Update: your changes"
git push origin main

# Vercel และ Render จะ auto-deploy
```

---

## 📞 ติดต่อสอบถาม

มีปัญหาการ Deploy ติดต่อ: [ใส่ข้อมูลติดต่อของคุณ]

---

**เรียบร้อย! 🎉**
