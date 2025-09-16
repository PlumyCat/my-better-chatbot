# Better Chatbot - Installation Permanente ✅

## 🎉 Configuration Terminée !

Votre application Better Chatbot est maintenant installée de manière permanente avec PM2.

## 🚀 Utilisation Quotidienne

### Script Principal
```bash
./manage.sh [COMMAND]
```

### Commandes Disponibles
- `./manage.sh start` - Démarrer l'application
- `./manage.sh stop` - Arrêter l'application
- `./manage.sh restart` - Redémarrer l'application
- `./manage.sh status` - Voir le statut
- `./manage.sh logs` - Voir les logs
- `./manage.sh monitor` - Monitoring temps réel
- `./manage.sh open` - Ouvrir dans le navigateur
- `./manage.sh update` - Mettre à jour l'application

## 🔄 Démarrage Automatique

### Option 1: Démarrage avec WSL (Configuré ✅)
L'application se lance automatiquement quand vous ouvrez WSL grâce au script ajouté dans `.bashrc`.

### Option 2: Service Systemd (Optionnel)
```bash
./manage.sh install-service
sudo systemctl start better-chatbot
```

## 📊 Monitoring

- **Statut**: `./manage.sh status`
- **Logs en temps réel**: `./manage.sh logs`
- **Monitoring avancé**: `./manage.sh monitor`

## 🌐 Accès

- **URL**: http://localhost:3000
- **Ouverture rapide**: `./manage.sh open`

## 🔧 Maintenance

- **Mise à jour**: `./manage.sh update`
- **Recompilation**: `./manage.sh build`

## ⚡ Commandes PM2 Directes

Si vous préférez utiliser PM2 directement :
```bash
pm2 list                    # Lister les apps
pm2 restart better-chatbot  # Redémarrer
pm2 logs better-chatbot     # Logs
pm2 monit                   # Monitoring
pm2 save                    # Sauvegarder config
```

## 🆘 Dépannage

1. **Application ne démarre pas**: `./manage.sh build` puis `./manage.sh start`
2. **Port occupé**: Vérifiez avec `pm2 list` si une autre instance tourne
3. **Erreur de compilation**: `pnpm install` puis `./manage.sh build`

**L'application redémarre automatiquement en cas de crash grâce à PM2 !**