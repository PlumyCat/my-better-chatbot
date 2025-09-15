# Instructions pour créer l'exécutable Windows de Better Chatbot

## Prérequis

1. **Node.js** (version 18 ou supérieure)
   - Télécharger depuis: https://nodejs.org/

2. **pnpm** (gestionnaire de paquets)
   ```bash
   npm install -g pnpm
   ```

3. **Git** (pour cloner le projet)
   - Télécharger depuis: https://git-scm.com/

## Étapes d'installation

### 1. Cloner le projet

```bash
git clone [URL_DU_REPO]
cd better-chatbot
```

### 2. Configuration de l'environnement

Créer un fichier `.env` à la racine du projet avec vos clés API:

```env
# Base de données PostgreSQL (obligatoire)
POSTGRES_URL=postgres://username:password@localhost:5432/better_chatbot

# Secret pour l'authentification (générer avec: npx @better-auth/cli@latest secret)
BETTER_AUTH_SECRET=votre_secret_genere

# Clés API des fournisseurs LLM (au moins une requise)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### 3. Installation des dépendances

```bash
pnpm install
```

### 4. Configuration de la base de données

Si vous n'avez pas PostgreSQL, utilisez Docker:
```bash
pnpm docker:pg
```

Puis initialiser la base de données:
```bash
pnpm db:push
```

### 5. Build pour Windows

#### Option A: Script automatique (Windows)

Double-cliquez sur `scripts/build-windows.bat`

#### Option B: Commandes manuelles

```bash
# 1. Build Next.js en mode standalone
pnpm run build:local

# 2. Installer les dépendances Electron
pnpm add -D electron electron-builder cross-env
pnpm add electron-is-dev electron-serve

# 3. Créer l'exécutable Windows
npx electron-builder --win
```

## Résultat

L'exécutable Windows sera créé dans le dossier `dist-electron/`:
- `Better Chatbot Setup [version].exe` - Installateur Windows
- Dossier `win-unpacked/` - Version portable

## Configuration supplémentaire

### Icône personnalisée

Placez votre icône (format .ico) dans `build/icon.ico`

### Signature du code (optionnel)

Pour éviter les avertissements Windows, signez votre application:
1. Obtenez un certificat de signature de code
2. Ajoutez dans `electron-builder.json`:
```json
{
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "password"
  }
}
```

## Démarrage de l'application

### Mode développement
```bash
# Terminal 1: Démarrer Next.js
pnpm dev

# Terminal 2: Démarrer Electron
npx electron electron/main.js
```

### Mode production
Double-cliquez sur l'exécutable créé dans `dist-electron/`

## Problèmes courants

### Erreur "cannot find module"
Solution: Assurez-vous d'avoir exécuté `pnpm install` et `pnpm run build:local`

### L'application ne démarre pas
Solution: Vérifiez que PostgreSQL est en cours d'exécution et que les variables d'environnement sont correctement configurées

### Avertissement de sécurité Windows
Solution: L'application n'est pas signée. Cliquez sur "Plus d'infos" puis "Exécuter quand même"

## Structure des fichiers créés

```
better-chatbot/
├── electron/
│   └── main.js              # Point d'entrée Electron
├── electron-builder.json    # Configuration du build
├── package-electron.json    # Dépendances Electron
├── scripts/
│   ├── build-windows.bat   # Script Windows
│   └── build-windows.sh    # Script Unix/Linux
└── dist-electron/          # Dossier de sortie
    ├── Better Chatbot Setup.exe
    └── win-unpacked/
```

## Support

Pour toute question ou problème, consultez la documentation du projet ou ouvrez une issue sur GitHub.