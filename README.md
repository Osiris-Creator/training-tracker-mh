# 📚 Training Tracker System

ระบบบันทึกชั่วโมงการเทรนนิ่งพนักงาน สำหรับ MH E-Campus

## ✨ Features

- 📝 **Training Form**: ฟอร์มบันทึกการเทรนนิ่ง (Trainer/Trainee)
- 📊 **Dashboard**: สรุปสถิติการเทรนนิ่งทั้งหมด
- 🏆 **Leaderboard**: อันดับพนักงานที่เทรนมากที่สุด (Trainer/Trainee/Department)
- 👥 **Employee Management**: จัดการข้อมูลพนักงาน
- 🔍 **Search**: ค้นหาประวัติการเทรนนิ่ง
- 📱 **QR Code**: สแกน QR Code เพื่อเข้าใช้งานฟอร์ม
- 🎯 **Session Tracking**: ติดตามเซสชั่นเทรนนิ่งของวันนี้
- ⚙️ **Admin Settings**: รีเซ็ตข้อมูลการเทรนนิ่งทั้งหมด

---

## 🛠 Tech Stack

### Frontend
- React 18
- React Router v6
- Axios
- CSS3

### Backend
- Node.js + Express
- SQLite (Development)
- PostgreSQL (Production)
- QRCode Generator

---

## 📁 Project Structure

```
MH Ecampus/
├── frontend/              # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── utils/        # API utilities
│   │   └── App.js
│   ├── .env.development
│   ├── .env.production
│   └── package.json
│
├── backend/               # Node.js backend
│   ├── database.js       # SQLite connection
│   ├── server.js         # Express server
│   ├── migrate.js        # PostgreSQL migration
│   ├── import-employees.js
│   ├── .env.example
│   ├── render.yaml
│   └── package.json
│
├── employees.json         # Employee master data
├── DEPLOYMENT.md         # Deployment guide
└── README.md
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/training-tracker.git
cd training-tracker
```

### 2. Setup Backend

```bash
cd backend
npm install
npm run init-db    # Initialize SQLite database
npm run dev        # Start development server (port 3001)
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm start          # Start development server (port 3000)
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

---

## 🌐 Production Deployment

ดูคู่มือการ Deploy แบบละเอียดที่ [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Summary:

1. **Database**: Deploy PostgreSQL บน Render
2. **Backend**: Deploy Node.js บน Render
3. **Frontend**: Deploy React บน Vercel

---

## 📊 API Endpoints

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Add new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Training Records
- `GET /api/training` - Get all training records
- `POST /api/training` - Submit new training record
- `GET /api/training/employee/:id` - Get training by employee
- `GET /api/training/session/:id` - Get training session details
- `GET /api/training/today-sessions` - Get today's sessions
- `GET /api/training/trainer-topics/:name` - Get topics by trainer

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Leaderboard
- `GET /api/training/leaderboard/trainees` - Top trainees
- `GET /api/training/leaderboard/trainers` - Top trainers
- `GET /api/training/leaderboard/departments` - Top departments
- `GET /api/training/search?query=` - Search training records

### Admin
- `GET /api/admin/reset-preview` - Preview data to be deleted
- `DELETE /api/admin/reset-all-training` - Reset all training data

### Utilities
- `GET /api/qrcode?url=` - Generate QR code

---

## 🎨 Design System

### Color Palette
- **Primary**: `#D4735E` (Terracotta)
- **Background**: `#FDFBF7` (Warm Cream)
- **Surface**: `#F5F1E8` (Light Beige)
- **Text**: `#1A1A1A` (Dark Gray)
- **Border**: `#E8E3D6` (Light Border)

### Typography
- **Headings**: Playfair Display (Serif)
- **Body**: Inter (Sans-serif)

---

## 📱 QR Code Usage

1. สร้าง QR Code ที่ชี้ไปที่ `/training-form`
2. พิมพ์และติดที่จุดต่างๆ ในออฟฟิศ
3. พนักงานสแกนเพื่อเข้าถึงฟอร์ม

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (`frontend/.env.production`)

```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
```

---

## 🧪 Development Scripts

### Backend
```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
npm run migrate  # Run PostgreSQL migration
npm run import   # Import employees from JSON
```

### Frontend
```bash
npm start        # Start development server
npm run build    # Build for production
npm test         # Run tests
```

---

## 📝 License

MIT License - สามารถนำไปใช้และแก้ไขได้อย่างอิสระ

---

## 👥 Contributors

- [Your Name] - Initial work

---

## 🐛 Bug Reports & Feature Requests

พบปัญหาหรือมีไอเดียใหม่? เปิด [Issue](https://github.com/YOUR_USERNAME/training-tracker/issues)

---

**Made with ❤️ for MH E-Campus**
