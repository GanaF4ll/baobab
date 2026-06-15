# Baobab — Synthèse technique

> Mini alternative open-source et self-hostable à NotebookLM.  
> Base de connaissances documentaire interrogeable via LLM local, avec versionning de documents.

---

## Stack technique

### Backend
| Composant | Choix |
|---|---|
| Framework | NestJS (TypeScript) |
| Protocol API | REST + OpenAPI (Swagger) |
| Client Angular | Généré via `openapi-generator-cli` |
| Streaming | SSE (`@Sse()`) pour les réponses LLM |
| Auth | JWT + Passport |

### Frontend
| Composant | Choix |
|---|---|
| Framework | Angular (TypeScript) |
| Client API | Auto-généré depuis le schéma OpenAPI |

### Base de données
| Composant | Choix |
|---|---|
| SGBD | PostgreSQL |
| Extension vectorielle | pgvector |
| ORM | Drizzle ORM |

### Stockage
| Composant | Choix |
|---|---|
| Fichiers | MinIO (API compatible S3) |

### IA
| Composant | Choix |
|---|---|
| LLM | Ollama (llama3 / mistral) |
| Embeddings | Ollama — modèle `nomic-embed-text` |

### Déploiement
| Composant | Choix |
|---|---|
| Conteneurisation | Docker Compose |
| CI | GitHub Actions |

### Tests
| Composant | Choix |
|---|---|
| Backend | Jest |
| Frontend | Cypress |

---

## Fonctionnalités

### MVP

- **Authentification** — inscription, connexion, JWT refresh token
- **Gestion de documents** — upload PDF et Markdown, stockage MinIO, liste et suppression
- **Versionning** — historique des versions par document, consultation et restauration d'une version antérieure
- **Indexation** — parsing du contenu, découpage en chunks, génération d'embeddings via Ollama
- **Chat RAG** — question en langage naturel sur un document, recherche vectorielle pgvector, réponse streamée avec sources citées
- **Interface web** — viewer de document, interface de chat, historique des conversations

### Fonctionnalités avancées (post-MVP)

- **Recherche hybride** — combinaison full-text PostgreSQL et recherche vectorielle
- **Multi-documents** — interroger plusieurs documents simultanément dans une même conversation
- **Comparaison de versions** — diff textuel entre deux versions d'un document
- **Gestion des modèles** — interface d'administration pour choisir le modèle Ollama actif
- **Multi-utilisateurs** — support d'une petite équipe avec isolation des données par utilisateur

### Hors périmètre

- Support vidéo / audio
- Multi-tenancy public
- Application mobile native

---

## Schéma de base de données

```
users
  └── documents
        ├── document_versions
        └── chunks (embedding vector)
  └── conversations
        └── messages (sources jsonb)
```

---

*Baobab — open-source, self-hosted, TypeScript end-to-end.*