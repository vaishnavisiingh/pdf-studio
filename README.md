# PDF Studio — Powered by ID-REP

A desktop PDF editor with AI capabilities built with Electron + React + Python.

## Requirements

### Python (Backend)
- Python 3.10+
- pip

### Node.js (Frontend)
- Node.js 18+
- npm

## Setup & Run

### Step 1 — Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

Create `.env` file in `backend/` folder:
Get free API key from: https://console.groq.com

Start backend:
```bash
python main.py
```
Backend runs on http://127.0.0.1:8000

### Step 2 — Frontend Setup
```bash
cd frontend
npm install
npm run electron:dev
```

## For OCR (Optional)

Install Tesseract:
- **macOS:** `brew install tesseract`
- **Windows:** Download from https://github.com/UB-Mannheim/tesseract/wiki
- **Linux:** `sudo apt install tesseract-ocr`

## Tech Stack
- **Frontend:** Electron + React + Vite
- **Backend:** Python + FastAPI
- **PDF Engine:** PyMuPDF
- **AI:** Groq API (Llama 3.1 8B) — free tier
- **OCR:** Tesseract
