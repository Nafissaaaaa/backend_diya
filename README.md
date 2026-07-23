# Diyafa — Backend API

Backend Node.js / Express / PostgreSQL (Sequelize) pour la plateforme de reservation
d'hotels et de mraqed.

## Installation

```bash
cd diyafa-backend
npm install
cp .env.example .env
# Editer .env avec vos identifiants PostgreSQL

# Creer la base de donnees PostgreSQL au prealable :
# createdb diyafa

npm run dev          # demarre le serveur (cree/synchronise les tables automatiquement)
npm run db:seed      # cree le compte admin par defaut
```

Serveur disponible sur `http://localhost:5000`.

## Photos des etablissements (Cloudinary)

Les photos envoyees lors de l'inscription partenaire (10 max) sont uploadees
directement vers [Cloudinary](https://cloudinary.com) (compte gratuit) plutot
que sur le disque du serveur : indispensable sur Render, dont le systeme de
fichiers est efface a chaque redeploiement/redemarrage.

1. Creer un compte gratuit sur cloudinary.com
2. Dans le Dashboard, recuperer `Cloud name`, `API Key`, `API Secret`
3. Les renseigner dans `.env` (local) et dans les variables d'environnement
   du service Render (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

## Structure du projet

```
src/
  config/db.js              -> connexion PostgreSQL (Sequelize)
  models/                   -> User, Establishment, Room, Reservation, Notification, Review
  middleware/
    auth.js                 -> verification du token JWT
    authorize.js             -> verification du role (client / owner / admin)
  controllers/               -> toute la logique metier
  routes/                    -> definition des endpoints
  utils/jwt.js               -> generation/verification des tokens
  utils/seed.js              -> creation du compte admin initial
  app.js / server.js         -> point d'entree
```

## Roles

- **client** : voyageur qui reserve
- **owner** : hotel ou mraqed (partenaire)
- **admin** : administrateur de la plateforme

Le role est stocke dans le token JWT et verifie a chaque requete protegee.

## Le flux de reservation (coeur du projet)

```
1. Le client cree une reservation  -> statut = "pending"
2. Le owner (hotel/mraqed) recoit une notification
3. Le owner accepte  -> statut = "accepted"  -> apparait dans le dashboard admin
   OU
   Le owner refuse   -> statut = "rejected"  -> le client est notifie
```

## Endpoints principaux

### Auth (public)
| Methode | Route | Description |
|---|---|---|
| POST | /api/auth/register | Inscription (client ou owner) |
| POST | /api/auth/login | Connexion |
| GET | /api/auth/me | Profil de l'utilisateur connecte |

### Etablissements (public)
| Methode | Route | Description |
|---|---|---|
| GET | /api/establishments | Liste des etablissements valides (filtres: ville, type) |
| GET | /api/establishments/:id | Detail d'un etablissement |

### Client (role: client)
| Methode | Route | Description |
|---|---|---|
| POST | /api/reservations | Creer une reservation (statut pending) |
| GET | /api/reservations/me | Mes reservations |
| PATCH | /api/reservations/:id/cancel | Annuler ma reservation |

### Owner - hotel/mraqed (role: owner)
| Methode | Route | Description |
|---|---|---|
| POST | /api/owner/establishments | Creer son etablissement (en attente de validation) |
| PUT | /api/owner/establishments/:id | Modifier son etablissement |
| GET | /api/owner/establishments/me | Mes etablissements |
| POST | /api/owner/establishments/:establishmentId/rooms | Ajouter une chambre/place |
| PUT | /api/owner/rooms/:id | Modifier une chambre/place |
| DELETE | /api/owner/rooms/:id | Supprimer une chambre/place |
| GET | /api/owner/reservations | Reservations recues (filtre ?statut=pending) |
| PATCH | /api/owner/reservations/:id/accept | Accepter une reservation |
| PATCH | /api/owner/reservations/:id/reject | Refuser une reservation |

### Admin (role: admin)
| Methode | Route | Description |
|---|---|---|
| GET | /api/admin/establishments/pending | Etablissements en attente de validation |
| PATCH | /api/admin/establishments/:id/validate | Valider/refuser un etablissement |
| PATCH | /api/admin/establishments/:id/best-image | Choisir la photo de couverture parmi celles envoyees |
| GET | /api/admin/reservations?statut=accepted | Reservations confirmees (dashboard) |
| GET | /api/admin/users | Liste des utilisateurs |
| PATCH | /api/admin/users/:id/status | Bloquer/debloquer un utilisateur |
| GET | /api/admin/stats | Statistiques globales |

### Notifications (utilisateur connecte)
| Methode | Route | Description |
|---|---|---|
| GET | /api/notifications/me | Mes notifications |
| PATCH | /api/notifications/:id/read | Marquer comme lue |

## Authentification

Toutes les routes protegees attendent un header :

```
Authorization: Bearer <token>
```

Le token est recu a la connexion (`/api/auth/login`) ou a l'inscription.

## Exemple de flux complet (test manuel avec Postman)

1. `POST /api/auth/register` avec `role: "owner"` -> creer un compte hotel
2. `POST /api/owner/establishments` (avec le token owner) -> creer l'hotel
3. Se connecter en admin (`admin@diyafa.dz` / `Admin@2026` apres `npm run db:seed`)
4. `PATCH /api/admin/establishments/:id/validate` avec `{ "decision": "valide" }`
5. `POST /api/owner/establishments/:id/rooms` -> ajouter une chambre
6. `POST /api/auth/register` avec `role: "client"` -> creer un compte client
7. `POST /api/reservations` (token client) -> creer une reservation (statut pending)
8. `GET /api/owner/reservations?statut=pending` (token owner) -> voir la demande
9. `PATCH /api/owner/reservations/:id/accept` (token owner) -> accepter
10. `GET /api/admin/reservations?statut=accepted` (token admin) -> la reservation apparait

## Prochaines etapes (V2)

- Paiement en ligne (CIB/Edahabia)
- Upload d'images vers Cloudinary/S3
- WebSocket pour notifications en temps reel
- Envoi d'emails (Nodemailer) a chaque changement de statut
