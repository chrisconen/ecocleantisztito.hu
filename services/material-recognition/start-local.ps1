# Owner-only selection. Customer requests cannot choose the provider.
param([ValidateSet('gemini','openai')][string]$Provider = 'gemini')
# Run from any working directory. No key values are displayed or stored in files.
$ErrorActionPreference = 'Stop'
foreach ($materialKeyName in @('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY')) {
    if (-not [Environment]::GetEnvironmentVariable($materialKeyName, 'Process')) {
        $materialKeyValue = [Environment]::GetEnvironmentVariable($materialKeyName, 'User')
        if ($materialKeyValue) {
            [Environment]::SetEnvironmentVariable($materialKeyName, $materialKeyValue, 'Process')
        }
    }
}
Remove-Variable materialKeyValue -ErrorAction SilentlyContinue
$env:MATERIAL_PROVIDER = $Provider
python (Join-Path $PSScriptRoot 'server.py') --serve-demo --dev-cors
