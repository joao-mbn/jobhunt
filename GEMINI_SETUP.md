# Gemini API Integration Setup

This guide will help you set up the Gemini API integration for job relevance analysis.

## Prerequisites

1. A Google Cloud Project
2. Gemini API access enabled

## Step 1: Enable Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (you'll need this for the environment variable)

## Step 2: Set Environment Variables

Add the following to your `.env` file:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google Sheets (optional - for uploading results)
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEET_NAME=Job Data
GOOGLE_CLIENT_EMAIL=your_service_account_email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

## Step 3: Install Dependencies

```bash
bun install
```

## Step 4: Run the Job Analysis

```bash
bun run start
```

## How It Works

### 1. RSS Feed Fetching

- Fetches job postings from LinkedIn via RSS
- Saves raw data to `data/linkedinJobs/linkedinJobs-YYYY-MM-DD.json`

### 2. Resume Analysis

- Loads your resume data from `data/myResume.json`
- Uses structured data including skills, experience, and achievements

### 3. AI-Powered Job Matching

The Gemini AI analyzes each job posting using these criteria:

**Technical Skills Match (40 points)**

- Programming languages alignment
- Framework/technology stack compatibility
- Required vs. candidate's experience level

**Role Alignment (30 points)**

- Position level (Junior/Mid/Senior) vs. candidate's experience
- Industry/domain relevance
- Responsibilities match candidate's strengths

**Experience Requirements (20 points)**

- Years of experience alignment
- Specific project/domain experience
- Leadership/mentoring opportunities

**Growth Potential (10 points)**

- Learning opportunities
- Career advancement potential
- Company size/industry growth

### 4. Scoring System

- **90-100**: Perfect match, highly recommended
- **80-89**: Very good match, strongly recommended
- **70-79**: Good match, recommended
- **60-69**: Moderate match, consider applying
- **50-59**: Some alignment, low priority
- **40-49**: Limited match, not recommended
- **0-39**: Poor match, skip

### 5. Output

- Analyzed jobs saved to `data/linkedinJobs/linkedinJobs-YYYY-MM-DD-analyzed.json`
- Top 10 most relevant jobs displayed in console
- Optional upload to Google Sheets with relevance scores
- Summary statistics including average relevance score

## Customization

### Modifying Relevance Criteria

Edit the `RELEVANCE_PROMPT` in `src/gemini.ts` to adjust:

- Scoring weights
- Evaluation criteria
- Output format

### Resume Data Structure

Update `data/myResume.json` to include:

- Current skills and technologies
- Work experience details
- Project achievements
- Certifications and education

## Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY environment variable is required"**
   - Make sure you've added the API key to your `.env` file
   - Verify the API key is valid and has proper permissions

2. **"Failed to parse JSON response from Gemini"**
   - The AI response format may have changed
   - Check the console for the actual response
   - Consider adjusting the prompt format

3. **Rate Limiting**
   - The system includes a 1-second delay between requests
   - For large job lists, consider increasing the delay
   - Monitor your Gemini API usage limits

4. **Analysis Failures**
   - Jobs with analysis failures get a default score of 20
   - Check the console for specific error messages
   - Verify job descriptions are not too long or malformed

### Performance Tips

- The system processes jobs sequentially to avoid rate limiting
- Large job lists may take several minutes to analyze
- Consider running during off-peak hours for better API performance

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- The Gemini API key has access to your Google AI Studio account
- Consider using environment-specific API keys for different deployments
