#!/bin/bash

# Script de démarrage pour Better Chatbot
# Ce script compile et démarre l'application avec PM2

echo "🚀 Démarrage de Better Chatbot..."

# Vérifier si l'application est déjà en cours d'exécution
if pm2 list | grep -q "better-chatbot"; then
    echo "✅ L'application est déjà en cours d'exécution"
    pm2 show better-chatbot
    echo ""
    echo "💡 Commandes utiles:"
    echo "   pm2 restart better-chatbot  # Redémarrer"
    echo "   pm2 stop better-chatbot     # Arrêter"
    echo "   pm2 logs better-chatbot     # Voir les logs"
    echo "   pm2 monit                   # Monitorer"
    exit 0
fi

# Aller dans le dossier du projet
cd /home/ric/Projects/better-chatbot

echo "📦 Installation des dépendances..."
pnpm install

echo "🔨 Compilation de l'application..."
pnpm build:local

echo "🚀 Démarrage avec PM2..."
pm2 start ecosystem.config.cjs

echo ""
echo "✅ Application démarrée avec succès!"
echo "🌐 URL: http://localhost:3000"
echo ""
echo "💡 Commandes utiles:"
echo "   pm2 list                    # Lister les apps"
echo "   pm2 logs better-chatbot     # Voir les logs"
echo "   pm2 restart better-chatbot  # Redémarrer"
echo "   pm2 stop better-chatbot     # Arrêter"
echo "   pm2 delete better-chatbot   # Supprimer"
echo "   pm2 monit                   # Monitorer en temps réel"
echo ""
echo "🔧 Pour auto-démarrage au boot WSL:"
echo "   pm2 startup"
echo "   pm2 save"