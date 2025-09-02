# Job Hunt Automation

## 🎯 What It Does

### Key Components

## 📋 Prerequisites

## ⚙️ Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd jobhunt
pnpm i
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini AI
GOOGLE_API_KEY=your_gemini_api_key_here

# RSS Feed
RSS_ENDPOINT=https://your-rss-feed-url.com/feed

# Google Sheets
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEET_NAME=Job Data
GOOGLE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
```

### 3. Google Cloud Setup

1. **Create a Google Cloud Project**
2. **Enable APIs**:
   - Gemini AI API
   - Google Sheets API
3. **Create Service Account**:
   - Go to IAM & Admin → Service Accounts
   - Create new service account
   - Download JSON credentials
   - Extract `client_email` and `private_key` to your `.env` file

### 4. Google Sheets Setup

1. Create a new Google Sheet
2. Share it with your service account email (with Editor permissions)
3. Copy the spreadsheet ID from the URL
4. Update `GOOGLE_SPREADSHEET_ID` in your `.env` file

### 5. Resume Configuration

Create a file `data/my-resume.json` with your current resume information. The AI uses this to:

- Score job relevance
- Generate tailored application materials
- Match your skills to job requirements

### 6. [Optional] Local AI All-in-one Setup

Use this if you want to run local models instead of resorting to Gemini API. If you don't have
docker installed, install it first. Then, install Local AI All-in-one:

```sh
docker run -p 8080:8080 --name local-ai -ti localai/localai:latest-aio-cpu
```

[Local AI](https://localai.io/basics/try/) is compatible with the
[Open AI API](https://platform.openai.com/docs/api-reference/introduction)

## 🎮 Usage

### Manual Run

```bash
# Run the job hunt automation once
deno run dev
```

### Automated Cron Job

```bash
# Start the cron job (runs every hour)
deno run cron
```

### Development Tasks

```bash
# Format code
deno task fmt

# Lint code
deno task lint
```

### Debug Mode (VS Code & Forks)

- Start any flow you wish to debug with a JavaScript debug terminal. `package.json` have a few scripts you can run in isolation.
