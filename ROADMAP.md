# Baobab — Roadmap de développement

---

## Phase 1 — Fondations du projet

- [X] Initialiser le monorepo Git avec la structure de dossiers définie
- [X] Configurer le `docker-compose.yml` avec PostgreSQL, MinIO et Ollama
- [x] Configurer le `docker-compose.dev.yml` (ports exposés, volumes pour hot-reload)
- [X] Vérifier que les trois services démarrent correctement
- [x] Télécharger et tester un modèle Ollama (`llama3` ou `mistral`) via l'API REST
- [x] Télécharger et tester le modèle d'embedding (`nomic-embed-text`) via l'API REST

---

## Phase 2 — Backend : initialisation NestJS

- [x] Créer le projet NestJS dans `backend/`
- [x] Configurer `@nestjs/config` avec un fichier `.env`
- [x] Mettre en place Drizzle ORM + connexion PostgreSQL
- [x] Activer l'extension `pgvector` dans PostgreSQL
- [x] Écrire le schéma Drizzle complet (`users`, `documents`, `document_versions`, `chunks`, `conversations`, `messages`)
- [x] Générer et appliquer les migrations Drizzle
- [x] Configurer Swagger (`@nestjs/swagger`) avec génération automatique de `openapi.json`

---

## Phase 3 — Backend : authentification

- [x] Créer le module `auth/`
- [x] Implémenter l'inscription et le hashage du mot de passe (`bcrypt`)
- [x] Implémenter la connexion et la génération du JWT
- [x] Mettre en place le refresh token
- [x] Créer le `JwtAuthGuard` et le `CurrentUser` decorator
- [x] Tester les routes auth via Swagger

---

## Phase 4 — Backend : gestion des documents

- [x] Créer le module `documents/`
- [x] Créer le `StorageModule` (client MinIO, upload, download, suppression)
- [x] Implémenter l'upload de fichier (PDF et Markdown)
- [x] Implémenter les routes CRUD (`GET /documents`, `GET /documents/:id`, `DELETE /documents/:id`)
- [x] Implémenter le parsing du contenu (PDF → `pdf-parse`, Markdown → texte brut)
- [x] Implémenter le découpage en chunks (taille fixe avec overlap)
- [x] Créer le `OllamaModule` (client HTTP vers Ollama)
- [x] Implémenter la génération d'embeddings via `nomic-embed-text` pour chaque chunk
- [x] Stocker les chunks et leurs vecteurs dans PostgreSQL

---

## Phase 5 — Backend : versionning de documents

- [x] Implémenter l'upload d'une nouvelle version d'un document existant
- [x] Créer un snapshot du contenu dans `document_versions` à chaque upload
- [x] Implémenter la route `GET /documents/:id/versions` (liste des versions)
- [x] Implémenter la route `GET /documents/:id/versions/:versionId` (consultation d'une version)
- [ ] Implémenter la restauration d'une version antérieure (re-découpage + re-embedding)

---

## Phase 6 — Backend : pipeline RAG

- [ ] Créer le module `rag/`
- [ ] Implémenter la vectorisation de la question utilisateur (via `nomic-embed-text`)
- [ ] Implémenter la recherche de similarité cosinus dans pgvector (top-K chunks)
- [ ] Implémenter la construction du prompt (contexte + question + historique)
- [ ] Implémenter l'appel au LLM Ollama en mode streaming
- [ ] Exposer la réponse en SSE (`@Sse()`) avec les sources citées

---

## Phase 7 — Backend : conversations

- [ ] Créer le module `conversations/`
- [ ] Implémenter la création et la liste des conversations par document
- [ ] Persister les messages (rôle `user` / `assistant`) avec les sources en `jsonb`
- [ ] Intégrer l'historique des messages dans le prompt RAG

---

## Phase 8 — Frontend : initialisation Angular

- [ ] Créer le projet Angular dans `frontend/`
- [ ] Configurer le routing principal (`auth`, `documents`, `chat`)
- [ ] Mettre en place les guards de navigation (route protégée si non connecté)
- [ ] Configurer `openapi-generator-cli` et générer le client API dans `src/api/`
- [ ] Créer un script npm pour regénérer le client depuis `openapi.json`

---

## Phase 9 — Frontend : authentification

- [ ] Créer le module `auth/` (pages login et inscription)
- [ ] Implémenter le service d'authentification (stockage du JWT, refresh)
- [ ] Créer l'interceptor HTTP pour injecter le token dans chaque requête
- [ ] Gérer la redirection après connexion / déconnexion

---

## Phase 10 — Frontend : gestion des documents

- [ ] Créer le module `documents/`
- [ ] Implémenter la liste des documents (cards avec titre, date, version courante)
- [ ] Implémenter l'upload de fichier avec barre de progression
- [ ] Implémenter la visualisation du contenu d'un document
- [ ] Implémenter l'historique des versions (liste + bouton de restauration)

---

## Phase 11 — Frontend : interface de chat

- [ ] Créer le module `chat/`
- [ ] Implémenter l'interface de conversation (messages user / assistant)
- [ ] Implémenter la réception en streaming SSE et l'affichage progressif de la réponse
- [ ] Afficher les sources citées sous chaque réponse (lien vers le chunk du document)
- [ ] Implémenter la liste et la navigation entre conversations

---

## Phase 12 — Qualité et livraison

- [ ] Écrire les tests unitaires Jest sur les services critiques (`rag/`, `documents/`)
- [ ] Écrire les tests e2e Cypress sur les parcours principaux (upload → chat)
- [ ] Configurer le pipeline CI GitHub Actions (lint, tests, build)
- [ ] Écrire le `README.md` (architecture, prérequis, démarrage en 3 commandes, démo)
- [ ] Enregistrer une démo vidéo (upload PDF → question → réponse streamée → historique versions)

---

## Fonctionnalités avancées (post-MVP)

- [ ] Recherche hybride (full-text PostgreSQL + vectorielle pgvector)
- [ ] Interrogation multi-documents dans une même conversation
- [ ] Diff textuel entre deux versions d'un document
- [ ] Interface d'administration pour choisir le modèle Ollama actif
- [ ] Support multi-utilisateurs avec isolation des données

---

*Les phases 1 à 7 peuvent avancer indépendamment du frontend. Valider le pipeline RAG complet (phase 6) via Swagger avant d'attaquer le frontend.*