@echo off
REM Script Windows pour lancer Better Chatbot dans WSL
REM À placer sur le bureau ou dans le menu démarrer

echo Demarrage de Better Chatbot...
echo.

REM Ouvrir une nouvelle fenêtre WSL et exécuter le script de démarrage
wsl -d Ubuntu cd /home/ric/Projects/better-chatbot && ./start-chatbot.sh

echo.
echo L'application devrait maintenant être accessible sur http://localhost:3000
echo.
pause