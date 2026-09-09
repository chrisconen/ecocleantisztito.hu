# Registers the current user's task only. Does not start it or read secrets.
[CmdletBinding()]
param(
    [string]$ArchiveRoot = '',
    [string]$ConfigPath = '',
    [string]$PythonWPath = '',
    [ValidateRange(30, 86400)][int]$Interval = 300
)

$ErrorActionPreference = 'Stop'
$materialTaskName = 'ECOClean-Material-Photo-Sync'
$materialProjectDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if (-not $ArchiveRoot) {
    $ArchiveRoot = Join-Path (Split-Path -Parent $materialProjectDir) 'anyag-referenciak'
}
$materialArchiveDir = [IO.Path]::GetFullPath($ArchiveRoot).TrimEnd('\')
if (-not $ConfigPath) { $ConfigPath = Join-Path $materialArchiveDir 'sync-config.json' }
$materialConfigFile = [IO.Path]::GetFullPath($ConfigPath)
$materialBackgroundFile = Join-Path $PSScriptRoot 'sync-background.py'

function Test-MaterialPrivatePath([string]$PathValue) {
    if ($PathValue.Equals($materialProjectDir, [StringComparison]::OrdinalIgnoreCase) -or
        $PathValue.StartsWith($materialProjectDir + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The archive and sync config must be outside the project web roots.'
    }
    if ($PathValue.IndexOf('"') -ge 0 -or $PathValue -match '[\x00-\x1f]') {
        throw 'Invalid control character or quote in a task path.'
    }
    $materialPathItem = Get-Item -LiteralPath $PathValue -Force -ErrorAction Stop
    while ($null -ne $materialPathItem) {
        if (($materialPathItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'Linked paths and junctions are not allowed for the private archive/config.'
        }
        if ($materialPathItem -is [IO.FileInfo]) {
            $materialPathItem = $materialPathItem.Directory
        } else {
            $materialPathItem = $materialPathItem.Parent
        }
    }
}

try {
    if (-not (Test-Path -LiteralPath $materialArchiveDir -PathType Container)) {
        throw 'The private archive directory must already exist.'
    }
    if (-not (Test-Path -LiteralPath $materialConfigFile -PathType Leaf)) {
        throw 'The private sync-config.json must already exist; this installer never creates credentials.'
    }
    Test-MaterialPrivatePath $materialArchiveDir
    Test-MaterialPrivatePath $materialConfigFile
    if (-not (Test-Path -LiteralPath $materialBackgroundFile -PathType Leaf)) {
        throw 'sync-background.py is missing.'
    }
    if (-not $PythonWPath) {
        $PythonWPath = (Get-Command pythonw.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    }
    $materialPythonW = (Get-Item -LiteralPath $PythonWPath -ErrorAction Stop).FullName
    if ([IO.Path]::GetFileName($materialPythonW) -ine 'pythonw.exe') {
        throw 'PythonWPath must select pythonw.exe, which runs without a console window.'
    }
    $materialPythonConsole = Join-Path (Split-Path -Parent $materialPythonW) 'python.exe'
    if (-not (Test-Path -LiteralPath $materialPythonConsole -PathType Leaf)) {
        throw 'The matching python.exe interpreter is missing.'
    }
    & $materialPythonConsole -c 'import sys, PIL; assert sys.version_info >= (3, 11), "Python 3.11 or newer is required"'
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.11+ and the project Pillow dependency are required.' }

    $materialIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $materialUser = $materialIdentity.Name
    $materialSid = $materialIdentity.User.Value
    $materialExisting = Get-ScheduledTask -TaskPath '\' -ErrorAction Stop |
        Where-Object { $_.TaskName -eq $materialTaskName }
    if ($materialExisting) {
        $materialExistingUser = $materialExisting.Principal.UserId
        if ($materialExistingUser -ne $materialUser -and $materialExistingUser -ne $materialSid) {
            throw 'An existing task with this name belongs to another account; it will not be replaced.'
        }
    }

    # Windows paths cannot contain quotes; all arguments below are local paths,
    # never credentials, shell expressions, or reference-publishing switches.
    $materialArguments = '"' + $materialBackgroundFile + '" --root "' + $materialArchiveDir +
        '" --config "' + $materialConfigFile + '" --interval ' + $Interval
    $materialAction = New-ScheduledTaskAction -Execute $materialPythonW -Argument $materialArguments -WorkingDirectory $PSScriptRoot
    $materialTrigger = New-ScheduledTaskTrigger -AtLogOn -User $materialUser
    $materialPrincipal = New-ScheduledTaskPrincipal -UserId $materialSid -LogonType Interactive -RunLevel Limited
    $materialSettings = New-ScheduledTaskSettingsSet -Hidden -MultipleInstances IgnoreNew -StartWhenAvailable `
        -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    if (-not $materialSettings.AllowDemandStart) {
        throw 'The task settings unexpectedly disallow manual starts.'
    }
    Register-ScheduledTask -TaskName $materialTaskName -TaskPath '\' -Action $materialAction `
        -Trigger $materialTrigger -Principal $materialPrincipal -Settings $materialSettings `
        -Description 'Private ECO Clean photo downloads every 300 seconds. No automatic reference publishing.' `
        -Force -ErrorAction Stop | Out-Null

    $materialInstalled = Get-ScheduledTask -TaskName $materialTaskName -TaskPath '\' -ErrorAction Stop
    if ($materialInstalled.Actions.Execute -ne $materialPythonW -or
        $materialInstalled.Principal.RunLevel -ne 'Limited' -or
        -not $materialInstalled.Settings.AllowDemandStart) {
        throw 'The registered task does not match the requested current-user configuration.'
    }
    Write-Output ('Registered for the current user: ' + $materialTaskName)
    Write-Output ('Start now: Start-ScheduledTask -TaskName "' + $materialTaskName + '"')
    Write-Output ('Private status file: ' + (Join-Path $materialArchiveDir 'sync-status.json'))
} catch {
    Write-Error ('Sync task installation failed. No administrator/password or alternate startup fallback was attempted. ' + $_.Exception.Message)
    exit 1
}
