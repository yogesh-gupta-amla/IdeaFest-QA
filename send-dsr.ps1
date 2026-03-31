<#
.SYNOPSIS
    Sends today's DSR report (HTML) via email as both an inline body and attachment.

.DESCRIPTION
    Reads the generated HTML report from dsr-data/reports/dsr-{DATE}.html,
    sends it as a rich HTML email body, and attaches the file.
    Reads SMTP configuration from email-config.json.

.PARAMETER Date
    Date of the report in yyyy-MM-dd format. Defaults to today.

.PARAMETER ConfigPath
    Path to email-config.json. Defaults to .\email-config.json.

.PARAMETER ReportsDir
    Path to the reports directory. Defaults to .\dsr-data\reports.

.EXAMPLE
    .\send-dsr.ps1
    .\send-dsr.ps1 -Date 2026-03-30
    .\send-dsr.ps1 -Date 2026-03-30 -ConfigPath C:\dsr-tool\email-config.json
#>

param(
    [string]$Date        = (Get-Date -Format "yyyy-MM-dd"),
    [string]$ConfigPath  = "$PSScriptRoot\email-config.json",
    [string]$ReportsDir  = "$PSScriptRoot\dsr-data\reports"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Load config ──────────────────────────────────────────────────────────────
if (-not (Test-Path $ConfigPath)) {
    Write-Error "email-config.json not found at: $ConfigPath`nCopy email-config.json and fill in your SMTP credentials."
    exit 1
}
$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json

# ── Locate HTML report ────────────────────────────────────────────────────────
$htmlFile = Join-Path $ReportsDir "dsr-$Date.html"
if (-not (Test-Path $htmlFile)) {
    Write-Error "Report not found: $htmlFile`nRun /create-dsr first to generate the report."
    exit 1
}

$htmlBody = Get-Content $htmlFile -Raw -Encoding UTF8

# ── Build subject ─────────────────────────────────────────────────────────────
$displayDate = (Get-Date $Date).ToString("dd MMM yyyy")
$subject = $cfg.subjectTemplate -replace '\{DATE\}', $displayDate

# ── Build SMTP client ─────────────────────────────────────────────────────────
$smtp = New-Object System.Net.Mail.SmtpClient($cfg.smtp.server, $cfg.smtp.port)
$smtp.EnableSsl       = [bool]$cfg.smtp.useSsl
$smtp.Credentials     = New-Object System.Net.NetworkCredential($cfg.smtp.username, $cfg.smtp.password)
$smtp.DeliveryMethod  = [System.Net.Mail.SmtpDeliveryMethod]::Network

# ── Build message ─────────────────────────────────────────────────────────────
$msg = New-Object System.Net.Mail.MailMessage
$msg.From         = New-Object System.Net.Mail.MailAddress($cfg.from.address, $cfg.from.displayName)
$msg.Subject      = $subject
$msg.IsBodyHtml   = $true
$msg.Body         = $htmlBody
$msg.BodyEncoding = [System.Text.Encoding]::UTF8

# Recipients
foreach ($addr in $cfg.to)  { $msg.To.Add($addr) }
foreach ($addr in $cfg.cc)  { $msg.CC.Add($addr) }

# Attach HTML file
$attachment = New-Object System.Net.Mail.Attachment($htmlFile, "text/html")
$attachment.ContentDisposition.FileName = "dsr-$Date.html"
$msg.Attachments.Add($attachment)

# Also attach Markdown if it exists
$mdFile = Join-Path $ReportsDir "dsr-$Date.md"
if (Test-Path $mdFile) {
    $mdAttachment = New-Object System.Net.Mail.Attachment($mdFile, "text/markdown")
    $mdAttachment.ContentDisposition.FileName = "dsr-$Date.md"
    $msg.Attachments.Add($mdAttachment)
}

# ── Send ──────────────────────────────────────────────────────────────────────
Write-Host "Sending DSR report for $displayDate..." -ForegroundColor Cyan
Write-Host "  From   : $($cfg.from.address)" -ForegroundColor Gray
Write-Host "  To     : $($cfg.to -join ', ')" -ForegroundColor Gray
Write-Host "  Subject: $subject" -ForegroundColor Gray
Write-Host "  Report : $htmlFile" -ForegroundColor Gray

try {
    $smtp.Send($msg)
    Write-Host "`n✅ DSR email sent successfully!" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ Failed to send email: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "  • Gmail: Use an App Password (not your account password)" -ForegroundColor Yellow
    Write-Host "    -> Google Account > Security > 2-Step Verification > App Passwords" -ForegroundColor Yellow
    Write-Host "  • Outlook/Office 365: Use smtp.office365.com port 587" -ForegroundColor Yellow
    Write-Host "  • Check that less-secure app access or SMTP AUTH is enabled" -ForegroundColor Yellow
    exit 1
}
finally {
    $msg.Dispose()
    $smtp.Dispose()
}
