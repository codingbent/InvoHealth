# 🏥 InvoHealth — Medical Center Management System (MERN)

A full-stack **clinic management and patient workflow system** built using the **MERN stack**, designed for doctors and small medical centers to manage **patients, appointments, billing, and analytics** in a production-ready environment.

Unlike basic CRUD apps, InvoHealth focuses on **real-world healthcare workflows**, including secure authentication, OTP verification, billing accuracy, and audit-safe reporting.

---

## 🚀 Key Features

### 👨‍⚕️ Doctor & Authentication

* Secure doctor signup & login (JWT-based)
* OTP-based email verification (secure + Redis-backed)
* Forgot password with OTP reset flow
* Role-based access (doctor, staff, patient)

---

### 📋 Patient Management

* Create and manage patient records
* Multi-profile support per email
* Secure patient data isolation

---

### 📅 Appointment System

* Smart appointment scheduling
* Slot conflict detection
* Multi-visit tracking per patient

---

### 💳 Billing & Invoicing

* Service-based billing system
* Percentage & fixed discount handling
* Accurate financial calculations (no drift)
* Invoice number tracking (audit-safe)

---

### 📊 Reports & Analytics

* Daily dashboard (default: today)
* Revenue, collection, pending tracking
* Service-level analytics with correct discount distribution
* Excel export (clinic-ready format)

---

### 📱 UI / UX

* Fully responsive (mobile + desktop)
* Skeleton loaders & smooth transitions
* Clean, production-grade UI

---

### ☁️ Infrastructure

* Cloud-hosted backend (Render)
* MongoDB Atlas database
* Redis-backed OTP system (multi-instance safe)

---

## 🛠 Tech Stack

### Frontend

* React.js (CRA)
* Bootstrap 5
* React Router DOM
* Fetch API

### Backend

* Node.js + Express.js
* MongoDB (Mongoose)
* JWT Authentication
* Redis (OTP store)
* bcrypt (password hashing)

### Deployment

* Frontend → Vercel
* Backend → Render
* Database → MongoDB Atlas

---

## 📦 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/codingbent/InvoHealth.git
cd InvoHealth
```

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
nodemon index.js
```

Runs at:

```bash
http://localhost:5001
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm start
```

Runs at:

```bash
http://localhost:3000
```

---

🔑 Environment Variables

### Backend (`/backend/.env`)

```env
PORT=5001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
REDIS_URL=your_redis_url
MAIL_USER=your_email
MAIL_PASS=your_password
```

---

### Frontend (`/frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5001
```

---

🗄 MongoDB Setup

1. Create cluster → https://www.mongodb.com/atlas
2. Create DB user
3. Allow IP (0.0.0.0/0 for dev)
4. Add connection string to `.env`

---

☁️ Deployment

### Backend (Render)

* Build:

```bash
npm install
```

* Start:

```bash
node index.js
```

---

### Frontend (Vercel)

* Import repo
* Select `/frontend`
* Add:

```env
REACT_APP_API_URL=https://your-backend-url
```

---

🔐 Authentication Flow

* Signup → Email OTP verification
* Login → Email + password
* Forgot Password → OTP → Reset
* JWT-protected routes

---

⚠️ Production Highlights

* Redis-backed OTP (no in-memory risk)
* CSPRNG OTP generation (crypto-safe)
* No double billing / discount drift
* Service-level accurate analytics
* Multi-instance safe architecture

---

📈 Future Improvements

* Offline-first (IndexedDB)
* Advanced analytics dashboard
* PWA support
* Dark mode

---

👨‍💻 Author

**Abhed Agarwal**
Full Stack Developer (MERN)

📧 [abhed.agl@gmail.com](mailto:abhed.agl@gmail.com)
🌐 https://github.com/codingbent

---
