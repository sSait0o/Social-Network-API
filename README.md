# My Social Networks - API

API REST en Node.js, Express et MongoDB pour gérer des événements, des groupes, des discussions, des albums photo, des sondages et une billetterie.

## Lancer le projet

```bash
npm install
cp .env.example .env   # remplir MONGODB_URI et JWT_SECRET
npm run certs          # certificat HTTPS local
npm start              # https://localhost:3000
```

Des exemples de requêtes sont dans `tests.http`.

## Sécurité

- Authentification par token JWT (`Authorization: Bearer <token>`)
- Mots de passe hachés (bcrypt)
- Validation des données avec Mongoose
- Helmet, CORS, HTTPS et limitation du nombre de requêtes

## Routes

Toutes les routes demandent un token, sauf l'inscription, la connexion et l'achat de billets.

### Authentification
| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | Créer un compte |
| POST | `/auth/login` | Se connecter |

### Utilisateurs
| Méthode | Route | Description |
|---|---|---|
| GET | `/users` | Liste des utilisateurs |
| GET | `/users/:id` | Voir un utilisateur |
| PUT | `/users/:id` | Modifier son compte |
| DELETE | `/users/:id` | Supprimer son compte |

### Groupes
| Méthode | Route | Description |
|---|---|---|
| POST | `/group` | Créer un groupe |
| GET | `/groups` | Liste des groupes |
| GET | `/group/:id` | Voir un groupe |
| PATCH | `/group/:id` | Modifier un groupe |
| DELETE | `/group/:id` | Supprimer un groupe |
| POST | `/group/:id/join` | Rejoindre un groupe public |
| POST | `/group/:id/member` | Ajouter un membre |
| DELETE | `/group/:id/member/:iduser` | Retirer un membre |
| POST | `/group/:id/admin` | Ajouter un admin |
| DELETE | `/group/:id/admin/:iduser` | Retirer un admin |

### Événements
| Méthode | Route | Description |
|---|---|---|
| POST | `/event` | Créer un événement |
| GET | `/events` | Liste des événements |
| GET | `/event/:id` | Voir un événement |
| PATCH | `/event/:id` | Modifier un événement |
| DELETE | `/event/:id` | Supprimer un événement |
| POST | `/event/:id/participants` | Ajouter des participants |
| POST | `/event/:id/invite-group` | Inviter tous les membres du groupe |
| DELETE | `/event/:id/participant/:iduser` | Retirer un participant |
| POST | `/event/:id/organizer` | Ajouter un organisateur |
| DELETE | `/event/:id/organizer/:iduser` | Retirer un organisateur |
| GET | `/event/:id/share` | Liens de partage sur les réseaux sociaux |

### Discussions
| Méthode | Route | Description |
|---|---|---|
| GET | `/group/:id/messages` | Messages d'un groupe |
| POST | `/group/:id/message` | Écrire dans un groupe |
| DELETE | `/group/:id/message/:idmessage` | Supprimer un message |
| GET | `/event/:id/messages` | Messages d'un événement |
| POST | `/event/:id/message` | Écrire dans un événement |
| DELETE | `/event/:id/message/:idmessage` | Supprimer un message |

### Albums et photos
| Méthode | Route | Description |
|---|---|---|
| POST | `/event/:idevent/album` | Créer un album |
| GET | `/event/:idevent/albums` | Albums d'un événement |
| GET | `/album/:id` | Voir un album |
| PUT | `/album/:id` | Modifier un album |
| DELETE | `/album/:id` | Supprimer un album |
| POST | `/album/:idalbum/photo` | Ajouter une photo |
| GET | `/album/:idalbum/photos` | Photos d'un album |
| GET | `/album/:idalbum/photo/:idphoto` | Voir une photo |
| DELETE | `/album/:idalbum/photo/:idphoto` | Supprimer une photo |
| POST | `/album/:idalbum/photo/:idphoto/comment` | Commenter une photo |
| GET | `/album/:idalbum/photo/:idphoto/comments` | Commentaires d'une photo |
| DELETE | `/album/:idalbum/photo/:idphoto/comment/:idcomment` | Supprimer un commentaire |

### Sondages
| Méthode | Route | Description |
|---|---|---|
| POST | `/event/:idevent/poll` | Créer un sondage |
| GET | `/event/:idevent/polls` | Sondages d'un événement |
| GET | `/poll/:id` | Voir un sondage |
| DELETE | `/poll/:id` | Supprimer un sondage |
| POST | `/poll/:id/question/:idquestion/vote` | Répondre à une question |
| GET | `/poll/:id/results` | Résultats |

### Billetterie
| Méthode | Route | Description |
|---|---|---|
| GET | `/event/:idevent/ticket-types` | Types de billets (sans token) |
| POST | `/event/:idevent/ticket` | Acheter un billet (sans token) |
| POST | `/event/:idevent/ticket-type` | Créer un type de billet |
| DELETE | `/event/:idevent/ticket-type/:idtype` | Supprimer un type de billet |
| GET | `/event/:idevent/tickets` | Billets vendus |

### Liste de courses (bonus)
| Méthode | Route | Description |
|---|---|---|
| POST | `/event/:idevent/shopping-item` | Ajouter ce qu'on apporte |
| GET | `/event/:idevent/shopping-items` | Voir la liste |
| DELETE | `/event/:idevent/shopping-item/:iditem` | Retirer un élément |

### Covoiturage (bonus)
| Méthode | Route | Description |
|---|---|---|
| POST | `/event/:idevent/carpool` | Proposer un trajet |
| GET | `/event/:idevent/carpools` | Voir les trajets |
| DELETE | `/event/:idevent/carpool/:idcarpool` | Supprimer un trajet |

## Erreurs

Les erreurs sont renvoyées au format `{ "code": 400, "message": "..." }`.
