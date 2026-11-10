# Minimal static file server for local testing (no Node/Python needed).
#   powershell -ExecutionPolicy Bypass -File tools/serve.ps1 [-Port 8787]
param([int]$Port = 8787)
$root = Split-Path -Parent $PSScriptRoot
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".svg"="image/svg+xml"; ".png"="image/png"; ".jpg"="image/jpeg"; ".json"="application/json"; ".ico"="image/x-icon"; ".webp"="image/webp" }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Gamblers running at http://localhost:$Port/  (Ctrl+C to stop)"
while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
        $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
        if ($path -eq "") { $path = "index.html" }
        $file = [IO.Path]::GetFullPath((Join-Path $root $path))
        if (-not $file.StartsWith($root) -or -not (Test-Path $file -PathType Leaf)) {
            $ctx.Response.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes("404"); $ctx.Response.OutputStream.Write($b, 0, $b.Length)
        } else {
            $ext = [IO.Path]::GetExtension($file).ToLower()
            $ctx.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
            $ctx.Response.Headers.Add("Cache-Control", "no-store")
            $bytes = [IO.File]::ReadAllBytes($file)
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
    } catch { } finally { $ctx.Response.Close() }
}
