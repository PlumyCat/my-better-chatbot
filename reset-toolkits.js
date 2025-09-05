// Script temporaire pour réinitialiser les toolkits en localStorage
// À exécuter dans la console du navigateur

console.log('Réinitialisation des toolkits...');

// Vider le localStorage pour forcer le rechargement des paramètres par défaut
const appStorageKey = Object.keys(localStorage).find(key => key.includes('app-store') || key.includes('better-chatbot'));

if (appStorageKey) {
  console.log('Trouvé clé de stockage:', appStorageKey);
  localStorage.removeItem(appStorageKey);
  console.log('✅ Paramètres supprimés. Rechargez la page.');
} else {
  console.log('❌ Aucune clé de stockage trouvée. Essayez de vider tout le localStorage:');
  console.log('localStorage.clear(); location.reload();');
}