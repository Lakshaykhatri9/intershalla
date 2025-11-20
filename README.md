# PDF Rule Checker

A web application that allows users to upload PDF documents and check them against custom rules using AI/LLM analysis.

## Features

- 📄 Upload PDF documents (2-10 pages recommended)
- ✍️ Enter up to 3 custom rules to check
- 🤖 AI-powered rule evaluation using OpenAI
- 📊 Detailed results with evidence, reasoning, and confidence scores
- 🎨 Modern, responsive UI

## Prerequisites

- Node.js (v20.16.0 or higher recommended)
- npm or yarn
- OpenAI API key

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd client
   npm install
   cd ..
   ```

2. **Configure environment variables:**
   - Copy `env.example` to `.env` in the root directory
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your-api-key-here
     OPENAI_MODEL=gpt-4o-mini
     PORT=4000
     ```

## Running the Application

### Development Mode (runs both frontend and backend)
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:4000`
- Frontend dev server on `http://localhost:3000`

### Run Separately

**Backend only:**
```bash
npm run server:dev
```

**Frontend only:**
```bash
npm run client:dev
```

## Usage

1. Open `http://localhost:3000` in your browser
2. Upload a PDF file (up to 15MB)
3. Enter up to 3 rules to check (e.g., "The document must mention at least one date.")
4. Click "Check Document"
5. View results in the table showing:
   - Rule status (PASS/FAIL)
   - Evidence from the document
   - Reasoning
   - Confidence score (0-100)

## Example Rules

- "The document must have a purpose section."
- "The document must mention at least one date."
- "The document must define at least one term."
- "The document must mention who is responsible."
- "The document must list any requirements."

## Project Structure

```
assignment/
├── server/
│   └── index.js          # Express backend server
├── client/
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   ├── main.jsx      # React entry point
│   │   └── index.css     # Styles
│   ├── index.html
│   └── vite.config.js    # Vite configuration
├── package.json
├── env.example
└── README.md
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/check-document` - Upload PDF and check rules
  - Body: `multipart/form-data` with `file` (PDF) and `rules` (JSON array)

## Technologies Used

- **Backend:** Node.js, Express, OpenAI API, pdf-parse
- **Frontend:** React, Vite
- **Styling:** CSS3 with modern gradients

## License

ISC

