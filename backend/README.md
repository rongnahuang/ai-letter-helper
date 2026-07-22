# Letter Helper Backend

## Local setup

From the repository root, create and activate a virtual environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell, activate it with:

```powershell
.venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
python -m pip install -r requirements.txt
```

Create the local environment file and add your OpenAI API key:

```bash
cp .env.example .env
```

Then edit `.env` so it contains your real key:

```dotenv
OPENAI_API_KEY=your_api_key_here
```

The `.env` file is ignored by Git and must not be committed or exposed to the
Expo frontend.

Start the development server:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The health endpoint is available at `http://localhost:8000/health`.

## Test with Swagger

Open `http://localhost:8000/docs`, expand `POST /api/v1/analyze`, select **Try it
out**, choose a letter image for the `file` field, and select **Execute**. The
response contains the Chinese letter type, summary, deadline, and action list.
