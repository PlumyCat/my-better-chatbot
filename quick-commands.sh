#!/bin/bash

# Commandes rapides pour Better Chatbot avec PM2

case "$1" in
    "start")
        echo "🚀 Démarrage de Better Chatbot..."
        pm2 start ecosystem.config.cjs
        ;;
    "stop")
        echo "⏹️ Arrêt de Better Chatbot..."
        pm2 stop better-chatbot
        ;;
    "restart")
        echo "🔄 Redémarrage de Better Chatbot..."
        pm2 restart better-chatbot
        ;;
    "status")
        echo "📊 Statut de Better Chatbot..."
        pm2 list
        ;;
    "logs")
        echo "📝 Logs de Better Chatbot..."
        pm2 logs better-chatbot
        ;;
    "monitor")
        echo "📈 Monitoring de Better Chatbot..."
        pm2 monit
        ;;
    "open")
        echo "🌐 Ouverture dans le navigateur..."
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000
        elif command -v open &> /dev/null; then
            open http://localhost:3000
        else
            echo "URL: http://localhost:3000"
        fi
        ;;
    "update")
        echo "⬇️ Mise à jour de l'application..."
        git pull
        pnpm install
        pnpm build:local
        pm2 restart better-chatbot
        ;;
    *)
        echo "🤖 Better Chatbot - Commandes disponibles:"
        echo ""
        echo "  ./quick-commands.sh start     # Démarrer l'application"
        echo "  ./quick-commands.sh stop      # Arrêter l'application"
        echo "  ./quick-commands.sh restart   # Redémarrer l'application"
        echo "  ./quick-commands.sh status    # Voir le statut"
        echo "  ./quick-commands.sh logs      # Voir les logs"
        echo "  ./quick-commands.sh monitor   # Monitoring temps réel"
        echo "  ./quick-commands.sh open      # Ouvrir dans le navigateur"
        echo "  ./quick-commands.sh update    # Mettre à jour l'app"
        echo ""
        echo "🌐 URL: http://localhost:3000"
        ;;
esac