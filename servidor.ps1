# servidor.ps1 - mini servidor local do Pipoquetas (sem Python). Abre o site em http://localhost:8080
# Use pelo INICIAR.bat. Para parar, feche a janela preta.
$porta = 8080
$raiz = (Split-Path -Parent $MyInvocation.MyCommand.Path).TrimEnd('\') + '\'
$tipos = @{
  ".html" = "text/html; charset=utf-8"; ".js" = "application/javascript; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"; ".svg" = "image/svg+xml"; ".png" = "image/png"; ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"; ".gif" = "image/gif"; ".webp" = "image/webp"; ".ico" = "image/x-icon"
  ".woff" = "font/woff"; ".woff2" = "font/woff2"; ".ttf" = "font/ttf"; ".txt" = "text/plain; charset=utf-8"
}

$escutador = New-Object System.Net.HttpListener
$escutador.Prefixes.Add("http://localhost:$porta/")
try {
  $escutador.Start()
} catch {
  Write-Host "Nao consegui iniciar na porta $porta. Feche outro programa que use essa porta ou troque o numero no arquivo servidor.ps1."
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host "Pipoquetas rodando em http://localhost:$porta  (feche esta janela para parar)"
Start-Process "http://localhost:$porta/index.html"

while ($escutador.IsListening) {
  $ctx = $escutador.GetContext()
  try {
    $pedido = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($pedido -eq "") { $pedido = "index.html" }
    $arquivo = [System.IO.Path]::GetFullPath((Join-Path $raiz $pedido))
    $liberado = $arquivo.StartsWith($raiz) -and (Test-Path $arquivo -PathType Leaf) -and -not $arquivo.ToLower().EndsWith("tmdb_chave.txt")
    if ($liberado) {
      $ext = [System.IO.Path]::GetExtension($arquivo).ToLower()
      $ctx.Response.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($arquivo)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    $ctx.Response.StatusCode = 500
  }
  $ctx.Response.OutputStream.Close()
}
