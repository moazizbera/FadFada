# Talking Head Pipeline - Windows Setup
# Run this in PowerShell to set up the environment

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "=== Talking Head Pipeline Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check Python
try {
    $py = (Get-Command python).Source
    Write-Host "Python: $py" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python not found. Install Python 3.8-3.11 from python.org" -ForegroundColor Red
    exit 1
}

# Create venv
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "  Done" -ForegroundColor Green
}

# Activate
$venvActivate = Join-Path $ScriptDir ".venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    & $venvActivate
}

# Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip 2>&1 | Out-Null
Write-Host "  Done" -ForegroundColor Green

# Install requirements
Write-Host "Installing Python packages..." -ForegroundColor Yellow
python -m pip install -r requirements.txt 2>&1
Write-Host "  Done" -ForegroundColor Green

# Download models
Write-Host ""
Write-Host "Downloading Wav2Lip model weights..." -ForegroundColor Yellow
python download_models.py

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To activate the environment:"
Write-Host "  .venv\Scripts\Activate"
Write-Host ""
Write-Host "To run the pipeline:"
Write-Host "  python pipeline.py --image input.jpg --text ""Hello world"" --output output.mp4"
