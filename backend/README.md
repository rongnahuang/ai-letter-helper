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

Start the development server:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The health endpoint is available at `http://localhost:8000/health`. Interactive
API documentation is available at `http://localhost:8000/docs`.
