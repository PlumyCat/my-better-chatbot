#!/bin/bash

# Script pour démarrer automatiquement Better Chatbot au démarrage de WSL
# À ajouter dans ~/.bashrc ou ~/.profile

# Attendre que WSL soit complètement initialisé
sleep 2

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "PM2 non trouvé, installation..."
    npm install -g pm2
fi

# Démarrer l'application si elle n'est pas déjà en cours
if ! pm2 list | grep -q "better-chatbot"; then
    echo "Démarrage automatique de Better Chatbot..."
    cd /home/ric/Projects/better-chatbot
    pm2 start ecosystem.config.js
    pm2 save
fi