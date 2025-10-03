# Job Hunt Automation

This project is an automated job hunting assistant that continuously monitors multiple job sources, processes the data through AI-powered analysis, and delivers personalized job recommendations with application materials directly to your Google Sheets.

The application is built to be highly extensive and customizable, where module interoperability can be easily achieved and scaled independently. That being said, I've found scraping to be more art than science, so far, to the extent that it's highly skewed for finding software developer jobs, although the rest of the application would work for whatever kind of jobs are fed, given that the data structures would be respected.

Currently, the sources are LinkedIn, Indeed, BuiltIn Vancouver and Levels.fyi. The AI used is a mix of different Gemini models and Local AI default text model.

## What It Does

This is an ETL (Extract, Transform, Load) pipeline for job postings from different sources. Here's what happens at each stage:

**Extract**: The system pulls job data from various sources and stores it as raw data in a database.

**Transform**: The raw job data goes through three processing stages:

- **Cleaning**: Raw job posts are parsed and cleaned up to extract structured information
- **Enhancement**: AI analyzes each job and adds insights like relevance scoring and skill matching
- **Pre-fill Generation**: For high-scoring jobs, the system generates tailored application materials like cover letters and responses

**Load**: The final processed jobs, along with their pre-fills, are exported to Google Sheets for easy review and application.

## How It Works

The system operates as a series of scheduled cron jobs that process data in small batches, behaving like a queue system. This approach mitigates memory spikes and avoids rate limiting issues, especially with AI services, by spreading the workload over time instead of processing everything at once.

## Prerequisites

- **Node.js v24+**: Required for native TypeScript support, experimental `node:sqlite` module, and built-in `.env` file reading capabilities
- **Package Manager**: This project uses `pnpm` by default, but `yarn` and `npm` are also supported. If using an alternative package manager, delete the `pnpm-lock.yaml` file to avoid conflicts. For the rest of the docs, `pnpm` will be used, but the analogous from `yarn` or `npm` should work.
- **Docker** (optional): Required only if you want to use Local AI (see setup below).

## Setup

### Clone and Install Dependencies

```bash
git clone https://github.com/joao-mbn/jobhunt.git
cd jobhunt
pnpm i
```

### Setup Playwright

[Playwright Docs](https://playwright.dev/docs/intro#using-npm-yarn-or-pnpm) requires some additional setup. Do this after cloning and installing dependencies.

### Initialize the database

Run `pnpm run init-db` to create an empty file-based SQLite database under the path specified in `.env` file (see below).

### Resume Configuration

Create a file `data/my-resume.json` with your current resume information. There is no set structure, only that it's expected to fit `Record<string, unknown>`. This information is fed into the AI for generating insights and prefills.

### Google Cloud Setup

1. **Create a Google Cloud Project**
2. **Enable APIs**:
   - Gemini AI API
   - Google Sheets API
3. **Create Service Account**:
   - Go to IAM & Admin → Service Accounts
   - Create new service account
   - Download JSON credentials
   - Extract `client_email` and `private_key` to your `.env` file

### Google Sheets Setup

1. Create a new Google Sheet
2. Share it with your service account email (with Editor permissions)
3. Copy the spreadsheet ID from the URL
4. Keep that spreadsheet ID and the sheet name to put in the `.env` file for later on

### rss.app Setup

Getting jobs from linkedin uses a `rss.app` URL. You can setup yours here: [RSS APP](https://rss.app/new-rss-feed/linkedin).

This is the one I used, but it's geared for my needs:

```txt
https://www.linkedin.com/jobs/search/?f_E=2%2C3%2C4&f_TPR=r3600&f_WT=2%2C3&geoId=90009553&keywords=(%22full%20stack%22%20OR%20%22full-stack%22%20OR%20%22fullstack%22%20OR%20%22software%20engineer%22%20OR%20%22backend%22%20OR%20%22frontend%22)%20AND%20(React%20OR%20%22Next.js%22%20OR%20Node%20OR%20Vue%20OR%20Golang%20OR%20GO%20OR%20%22C%23%22%20OR%20%22C%20Sharp%22%20OR%20%22SQL%22%20OR%20Express%20OR%20Postgres%20OR%20Postgresql%20OR%20GraphQL)&origin=JOB_SEARCH_PAGE_SEARCH_BUTTON&refresh=true&sortBy=R&spellCorrectionEnabled=true
```

If you want to optimize for yours, I recommend learning about linkedin boolean search and how to tweak the different query parameters.

After you've configured yours, paste in the `LINKEDIN_ENDPOINT` in the `.env` file below.

### Levels Setup

Go to [Levels Job Page](https://www.levels.fyi/jobs), play with the filters and copy the URL and paste it in the `LEVELS_ENDPOINT` in the `.env` file below.

### Built-in Vancouver Setup

Go to [Built-in Vancouver Page](https://builtinvancouver.org/jobs/), play with the filters and copy the URL and paste it in the `BUILTIN_ENDPOINT` in the `.env` file below.

### (optional) Local AI All-in-one Setup

Use this if you want to run local models instead of resorting to Gemini API. If you don't have
docker installed, install it first. Then, install Local AI All-in-one:

```sh
docker run -p 8080:8080 --name local-ai -ti localai/localai:latest-aio-cpu
```

[Local AI](https://localai.io/basics/try/) is compatible with the
[Open AI API](https://platform.openai.com/docs/api-reference/introduction)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Scrapers
LINKEDIN_ENDPOINT=https://your-rss-feed-url.com/feed
LEVELS_ENDPOINT=https://www.levels.fyi/jobs/your-params
BUILTIN_ENDPOINT=https://builtinvancouver.org/jobs/your-params

# Google Sheets
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEET_NAME=your_sheet_name_here
GOOGLE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"

DB_PATH=./data/jobhunt.db
```

## Usage

Run `pnpm run cron` to start the entire application with the multiple cron jobs.

## Debug (VS Code & Forks)

Any `index.ts` is meant to be an entry point that runs in isolation, and `package.json` have a few scripts you can run in isolation. Run any individual step using a Javascript Debug Terminal.

By default the scripts will get environment variables from `.env.test`, so that test and production don't mix. It's recommended that you copy `.env` and change the values, most importantly the `GOOGLE_SPREADSHEET_ID` and/or `GOOGLE_SHEET_NAME` and the `DB_PATH`.

## Project Organization

### Folder Structure

```txt
src/
├── ai/                    # AI client implementations (Gemini, Local AI)
├── cron/                  # App's entry point. Scheduled orchestration and cron management
├── db/                    # Database schema and connection management
├── extract/               # Data extraction from various sources (Linkedin, Levels, etc.)
├── file-system/           # File system operations and utilities
├── load/                  # Data loading to external services (Google Sheets)
├── transform/             # Data transformation pipeline
│   ├── clean/             # Raw data cleaning and parsing
│   ├── enhance/           # AI-powered job analysis and scoring
│   └── prefills/          # Application material generation
├── types/                 # TypeScript type definitions and validators
│   ├── converters/        # Data format converters
│   ├── definitions/       # Core type definitions
│   └── validators/        # Data validation schemas
└── utils/                 # Common utilities and helper functions
data/                      # Database files and resume data
```

### Conventions

#### Entry Points

Each folder that serves as an entry point contains an `index.ts` file with a `main()` function. This convention is meant to easily identify modules of the application that work on its own. For example:

- `src/extract/index.ts` - Run data extraction in isolation
- `src/transform/clean/index.ts` - Run data cleaning independently
- `src/cron/index.ts` - Run the full orchestrated pipeline
