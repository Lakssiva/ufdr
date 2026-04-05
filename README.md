# 🕵️‍♂️ UFDR Investigation Tool

A full-stack **MERN-based digital forensics platform** designed to process UFDR files and extract meaningful insights such as chats, contacts, and call records.
This tool helps in **analyzing, filtering, and generating reports** from raw forensic data for investigation purposes.

---

## 🚀 Features

* 📂 **UFDR File Processing**

  * Supports XML, CSV, and JSON formats
  * Extracts structured forensic data

* 💬 **Evidence Extraction**

  * Chats, contacts, call logs
  * Organized and searchable format

* 🔍 **Advanced Filtering**

  * Search and filter large datasets easily
  * Query-based data retrieval

* ⚠️ **Pattern Detection**

  * Rule-based detection of suspicious activity
  * Highlights important investigation clues

* 🧠 **Natural Language Queries**

  * Ask queries in simple language
  * Get filtered results instantly

* 🔗 **Link Analysis**

  * Identify relationships between contacts
  * Visual understanding of connections

* 📊 **Report Generation**

  * Generate structured investigation reports
  * Easy to review and share findings

---

## 🛠️ Tech Stack

* **Frontend:** React.js
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **Other Tools:** XLSX Parsing, File Upload Handling

---

## 📁 Project Structure

```
ufdr/
├── backend/
│   ├── uploads/
│   ├── routes/
│   ├── controllers/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── assets/
│   └── dist/
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/ufdr.git
cd ufdr
```

---

### 2️⃣ Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection
PORT=5000
```

Run backend:

```bash
npm start
```

---

### 3️⃣ Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

---

## 📌 Usage

1. Upload UFDR file (XML / CSV / JSON)
2. System processes and extracts data
3. Use filters or natural queries
4. Analyze connections via link analysis
5. Generate reports

---

## 🔐 Security Note

* Sensitive data is handled locally
* `.env` files are ignored for security
* API keys are not exposed

---

## 🎯 Future Improvements

* 🔍 AI-based anomaly detection
* 📈 Advanced visualization dashboards
* 🌐 Multi-user authentication system
* ☁️ Cloud storage integration

---

## 💡 Inspiration

This project is built to simplify **digital forensic investigations** by converting complex UFDR data into actionable insights.

---

## 👨‍💻 Author

* Developed as part of a full-stack learning and investigation project

---

## ⭐ Show some support

If you like this project, give it a ⭐ on GitHub!

---
