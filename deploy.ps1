<#
  Déploiement de la landing Rem sur Vercel (via Vercel CLI).
  Le build/output sont lus depuis vercel.json (pnpm landing:build -> landing/dist).

  Usage :
    .\deploy.ps1            # déploiement de PRÉVISUALISATION (URL de test)
    .\deploy.ps1 -Prod      # déploiement en PRODUCTION
    .\deploy.ps1 -Login     # se connecter à Vercel (à faire une fois)

  Prérequis : Node + npm (la CLI Vercel est lancée via npx, aucune install globale requise).
#>
param(
  [switch]$Prod,
  [switch]$Login
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Say($msg) { Write-Host $msg -ForegroundColor Magenta }

# npx dispo ?
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host "npx introuvable. Installe Node.js (npm) puis relance." -ForegroundColor Red
  exit 1
  
}

if ($Login) {
  Say "Connexion à Vercel..."
  npx --yes vercel@latest login
  exit $LASTEXITCODE
}

if ($Prod) {
  Say "Déploiement PRODUCTION de la landing Rem sur Vercel..."
  npx --yes vercel@latest deploy --prod
} else {
  Say "Déploiement PREVIEW de la landing Rem sur Vercel..."
  Say "(ajoute -Prod pour la mise en production)"
  npx --yes vercel@latest deploy
}

exit $LASTEXITCODE
