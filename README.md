# PDF Studio
### Powered by ID-REP — Intelligent Document Representation

A desktop application for academic document intelligence.

## Stack
- **Frontend**: Electron + React + Vite
- **Backend**: Python + FastAPI
- **PDF Engine**: PyMuPDF + pdfplumber
- **AI**: Anthropic Claude API
- **Database**: SQLite

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run electron:dev
```

## Architecture
All document operations go through the **ID-REP** (Intelligent Document Representation) semantic tree.
Raw PDFs are parsed into a structured tree on open. All edits mutate the tree. The renderer
converts the tree back to pages for display.

```
PDF file → IDRepBuilder → IDRepDocument (tree)
                               ↕
                         IDRepEditor (mutations)
                               ↕
                         IDRepRenderer → page images → UI
```
