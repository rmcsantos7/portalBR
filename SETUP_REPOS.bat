@echo off
echo ====================================
echo  Push Atualizado - Bitbucket
echo ====================================
echo.

REM --- Configurar identidade Git global ---
git config --global user.email "cezarfelipe18@gmail.com"
git config --global user.name "Cezar Felipe"
echo Identidade Git configurada.
echo.

REM --- BACKEND ---
echo [1/4] Preparando API...
cd api
if not exist .git (
    git init -b main
    git remote add origin https://cezarfelipe18@bitbucket.org/cezarfelipe18/backend-gerarcredito-br.git
)
git add -A
git commit -m "fix: celular sem mascara coluna crd_mot_celular, ajustes plataforma v2"
echo.
echo [2/4] Fazendo push da API...
git push -u origin main --force
cd ..

echo.

REM --- FRONTEND ---
echo [3/4] Preparando Frontend...
cd frontend
if not exist .git (
    git init -b main
    git remote add origin https://cezarfelipe18@bitbucket.org/cezarfelipe18/front-gerarcredito-br.git
)
git add -A
git commit -m "fix: celular sem mascara, remove resumo dashboard, ajustes plataforma v2"
echo.
echo [4/4] Fazendo push do Frontend...
git push -u origin main --force
cd ..

echo.
echo ====================================
echo  Pronto! Ambos repos atualizados.
echo ====================================
pause
