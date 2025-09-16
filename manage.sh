#!/bin/bash

# Script de gestion Better Chatbot

show_help() {
    echo "🤖 Better Chatbot - Gestionnaire"
    echo ""
    echo "Usage: ./manage.sh [COMMAND]"
    echo ""
    echo "Commandes disponibles:"
    echo "  start           Démarrer l'application"
    echo "  stop            Arrêter l'application"
    echo "  restart         Redémarrer l'application"
    echo "  status          Afficher le statut"
    echo "  logs            Afficher les logs"
    echo "  monitor         Monitoring temps réel"
    echo "  build           Compiler l'application"
    echo "  update          Mettre à jour (git pull + build + restart)"
    echo "  install-service Installer le service systemd"
    echo "  enable-autostart Activer le démarrage automatique"
    echo "  open            Ouvrir dans le navigateur"
    echo ""
    echo "🌐 URL: http://localhost:3000"
}

case "$1" in
    start)
        echo "🚀 Démarrage de Better Chatbot..."
        cd /home/ric/Projects/better-chatbot
        pm2 start ecosystem.config.cjs
        echo "✅ Application démarrée sur http://localhost:3000"
        ;;
    stop)
        echo "⏹️ Arrêt de Better Chatbot..."
        pm2 stop better-chatbot
        ;;
    restart)
        echo "🔄 Redémarrage de Better Chatbot..."
        pm2 restart better-chatbot
        ;;
    status)
        echo "📊 Statut de Better Chatbot:"
        pm2 list
        ;;
    logs)
        echo "📝 Logs de Better Chatbot (Ctrl+C pour quitter):"
        pm2 logs better-chatbot
        ;;
    monitor)
        echo "📈 Monitoring de Better Chatbot (q pour quitter):"
        pm2 monit
        ;;
    build)
        echo "🔨 Compilation de Better Chatbot..."
        cd /home/ric/Projects/better-chatbot
        pnpm build:local
        ;;
    update)
        echo "⬇️ Mise à jour de Better Chatbot..."
        cd /home/ric/Projects/better-chatbot
        git pull
        pnpm install
        pnpm build:local
        pm2 restart better-chatbot
        echo "✅ Mise à jour terminée"
        ;;
    install-service)
        echo "🔧 Installation du service systemd..."
        sudo cp better-chatbot.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable better-chatbot
        echo "✅ Service installé. Utilisez 'sudo systemctl start better-chatbot' pour démarrer"
        ;;
    enable-autostart)
        echo "🔄 Activation du démarrage automatique..."
        if ! grep -q "auto-start.sh" ~/.bashrc; then
            echo "" >> ~/.bashrc
            echo "# Auto-start Better Chatbot" >> ~/.bashrc
            echo "/home/ric/Projects/better-chatbot/auto-start.sh &" >> ~/.bashrc
            echo "✅ Démarrage automatique activé"
        else
            echo "ℹ️ Démarrage automatique déjà activé"
        fi
        ;;
    open)
        echo "🌐 Ouverture de Better Chatbot..."
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000
        else
            echo "Ouvrez manuellement: http://localhost:3000"
        fi
        ;;
    *)
        show_help
        ;;
esac