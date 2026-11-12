# Déploiement du formulaire Overlord

## Configuration minimale

Le formulaire ne transmet rien tant que le webhook n’est pas configuré. Dans `main.js`, le mode direct accepte `DISCORD_WEBHOOK_URL` (constante en tête de fichier). **Un webhook intégré au JavaScript public est visible de tous** ; révoquez-le s’il fuite et préférez le proxy Cloudflare en production.

## Option recommandée : Cloudflare Worker

1. Déployer `webhook-proxy.js` comme Worker Cloudflare.
2. Dans **Settings → Variables and Secrets**, créer `DISCORD_WEBHOOK_URL` comme **secret** (URL du webhook Discord) et `ALLOWED_ORIGIN` comme variable contenant l’origine exacte du site, par exemple `https://faction.example` (sans barre finale).
3. Dans `main.js`, garder `DISCORD_WEBHOOK_URL = ''` et définir `DISCORD_PROXY_URL = 'https://<nom-worker>.<compte>.workers.dev'` (ou l’URL personnalisée du Worker). Le site envoie uniquement les champs de candidature au proxy ; l’embed est construit côté Worker et le secret n’est jamais livré au navigateur.
4. Vérifier que l’origine autorisée correspond exactement au domaine de production et tester le flux d’envoi. Appliquer en plus les contrôles de quota / rate limit Cloudflare adaptés à votre déploiement ; le cooldown du navigateur n’est qu’une protection UX, pas une défense anti-abus serveur.

Le Worker autorise uniquement `POST` et `OPTIONS` depuis l’origine configurée, limite la taille du corps, valide le pseudo Minecraft et n’autorise aucune mention Discord (`allowed_mentions: { parse: [] }`). L’envoi direct vers un webhook peut être bloqué par le CORS du fournisseur ; le proxy est l’option la plus fiable.

## Hébergement des pages

Publier ensemble les cinq fichiers HTML, `style.css`, `main.js`, `webhook-proxy.js` (pour référence / déploiement Worker) et le répertoire `assets/` contenant `logo.png` et `og-image.png`. Les liens des métadonnées Open Graph utilisent encore `VOTRE-DOMAINE.fr` : les remplacer par le domaine public avant lancement.
