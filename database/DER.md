# Diagrama Entidad–Relación (DER) — BidZone (MySQL)

Modelo relacional diseñado en **Tercera Forma Normal (3FN)** con **6 tablas vinculadas** (superando el mínimo obligatorio de 5 tablas), claves primarias (`PK`), claves foráneas (`FK`), restricciones de dominio (`CHECK`, `ENUM`) y reglas de integridad referencial (`CASCADE`, `RESTRICT`, `SET NULL`).

## Diagrama Visual (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ AUCTIONS : "publica (seller_id)"
    USERS ||--o{ AUCTIONS : "gana (winner_id)"
    USERS ||--o{ BIDS : "realiza (bidder_id)"
    AUCTIONS ||--o{ BIDS : "recibe (auction_id)"

    AUCTIONS ||--o{ REPORTS : "origina (auction_id)"
    USERS ||--o{ REPORTS : "denuncia (reporter_id)"
    USERS ||--o{ REPORTS : "es denunciado (reported_user_id)"

    AUCTIONS ||--o{ REVIEWS : "habilita (auction_id)"
    USERS ||--o{ REVIEWS : "emite (reviewer_id)"
    USERS ||--o{ REVIEWS : "recibe (target_user_id)"

    USERS ||--o{ NOTIFICATIONS : "recibe (user_id)"
    AUCTIONS ||--o{ NOTIFICATIONS : "referencia (auction_id)"

    USERS {
        int id PK "AUTO_INCREMENT"
        varchar name
        varchar email UK "UNIQUE"
        varchar password_hash "Hash bcrypt"
        enum role "user | admin"
        varchar phone
        varchar city
        enum status "active | suspended | closed"
        decimal reputation "1.00 - 5.00"
        datetime created_at
        datetime updated_at
    }

    AUCTIONS {
        int id PK "AUTO_INCREMENT"
        varchar title
        text description
        varchar category
        varchar image_url
        decimal base_price "CHECK > 0"
        decimal current_price "CHECK >= base_price"
        decimal min_increment "CHECK > 0"
        int seller_id FK "-> users.id"
        int winner_id FK "-> users.id (NULL)"
        enum status "activa | finalizada | cancelada"
        datetime end_time
        datetime created_at
        datetime updated_at
    }

    BIDS {
        int id PK "AUTO_INCREMENT"
        int auction_id FK "-> auctions.id"
        int bidder_id FK "-> users.id"
        decimal amount "CHECK > 0"
        varchar note
        tinyint commitment_accepted "RN04 = 1"
        datetime created_at
    }

    REPORTS {
        int id PK "AUTO_INCREMENT"
        int auction_id FK "-> auctions.id"
        int reporter_id FK "-> users.id"
        int reported_user_id FK "-> users.id"
        varchar reason
        text description
        varchar evidence_url
        enum status "en_revision | resuelto_sancion | desestimado"
        varchar sanction_applied
        datetime created_at
        datetime updated_at
    }

    REVIEWS {
        int id PK "AUTO_INCREMENT"
        int auction_id FK "-> auctions.id (UK c/ reviewer)"
        int reviewer_id FK "-> users.id (UK c/ auction)"
        int target_user_id FK "-> users.id"
        tinyint rating "CHECK 1..5"
        text comment
        enum role_context "comprador_a_vendedor | vendedor_a_comprador"
        datetime created_at
        datetime updated_at
    }

    NOTIFICATIONS {
        int id PK "AUTO_INCREMENT"
        int user_id FK "-> users.id"
        int auction_id FK "-> auctions.id (NULL)"
        varchar title
        text message
        enum type "outbid | won | closed | report | system"
        tinyint is_read "0 | 1"
        datetime created_at
    }
```

## Diccionario de Relaciones y Reglas de Integridad

| Relación | Cardinalidad | Clave Foránea | Acción Referencial | Regla de Negocio Asociada |
| :--- | :---: | :--- | :--- | :--- |
| `users` → `auctions` (vendedor) | `1 : N` | `auctions.seller_id` | `ON DELETE RESTRICT` | Identifica al dueño del lote; bloquea auto-pujas (**RN02**). |
| `users` → `auctions` (ganador) | `1 : N` | `auctions.winner_id` | `ON DELETE SET NULL` | Libera datos de contacto mutuos al cierre (**RN05**). |
| `auctions` → `bids` | `1 : N` | `bids.auction_id` | `ON DELETE CASCADE` | Historial cronológico de pujas en sala (**RN01**, **RN03**). |
| `users` → `bids` | `1 : N` | `bids.bidder_id` | `ON DELETE RESTRICT` | Compromiso vinculante e irrevocable del postor (**RN04**). |
| `auctions` → `reports` | `1 : N` | `reports.auction_id` | `ON DELETE CASCADE` | Vincula la denuncia a una operación específica. |
| `users` → `reports` | `1 : N` | `reporter_id`, `reported_user_id` | `ON DELETE RESTRICT` | Impide autodenuncia (`CHECK reporter_id <> reported_user_id`) y gestiona sanciones (**RN06**). |
| `auctions` → `reviews` | `1 : N` | `reviews.auction_id` | `ON DELETE CASCADE` | Restringe a una calificación por usuario y subasta con `UNIQUE (auction_id, reviewer_id)` (**RN07**). |
| `users` → `reviews` | `1 : N` | `reviewer_id`, `target_user_id` | `ON DELETE RESTRICT` | Escala de 1 a 5 estrellas (`CHECK rating BETWEEN 1 AND 5`) que recalcula `users.reputation`. |
| `users` → `notifications` | `1 : N` | `notifications.user_id` | `ON DELETE CASCADE` | Bandeja de alertas de sobrepuja, adjudicación y reportes. |

