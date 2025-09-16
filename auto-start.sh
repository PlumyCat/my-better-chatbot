#!/bin/bash

# Script d'auto-démarrage pour Better Chatbot
# À ajouter dans ~/.bashrc pour démarrage automatique

# Attendre un peu pour que WSL soit complètement initialisé
sleep 3

# Aller dans le répertoire du projet
cd /home/ric/Projects/better-chatbot

# Vérifier si l'application est déjà en cours d'exécution
if pm2 list 2>/dev/null | grep -q "better-chatbot.*online"; then
    echo "✅ Better Chatbot déjà en cours d'exécution"
    exit 0
fi

# Vérifier si PM2 est disponible
if ! command -v pm2 &> /dev/null; then
    echo "PM2 non trouvé, installation..."
    pnpm add -g pm2
fi

# Démarrer l'application si elle n'est pas en cours
echo "🚀 Démarrage automatique de Better Chatbot..."
pm2 start ecosystem.config.cjs 2>/dev/null || {
    echo "Première compilation nécessaire..."
    pnpm build:local
    pm2 start ecosystem.config.cjs
}

# Sauvegarder la configuration
pm2 save

echo "✅ Better Chatbot démarré automatiquement - http://localhost:3000"