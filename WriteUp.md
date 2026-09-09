# Write-up

## 1. What did you build for Part B, and why that?

I built a visit and spending log, then extended it into a shared food-photo
journal. The starter UI only showed restaurants even though a `visits` table
already existed. Recording a meal was therefore the smallest feature that made
the app fulfill its premise. People can now attach a favorite food photo to a
visit and rate each plate from one to five stars. The home page combines total
spend, recent visits, an uploadable photo wall, and a more personal editorial
design. The feature is useful end to end rather than being an isolated endpoint.

## 2. What did you decide, and what did you rule out?

`GET /api/visits` returns visits newest first with `restaurantName` included so
the UI does not need one request per restaurant. `POST /api/visits` accepts the
foreign key and visit fields, validates them before querying, then uses one CTE
to insert and return the joined response. Shared row mappers keep database
`NUMERIC`, `DATE`, and timestamp values out of the HTTP contract.

Food photos and ratings use separate tables so many ratings can contribute to
one photo's average. Images are validated and stored locally while metadata is
stored in PostgreSQL. I added guarded deletion for photos, visits, and
restaurants, but did not add accounts, editing, pagination, filters, or charts.
One tradeoff is that the all-time total is calculated
from the returned list rather than a dedicated aggregate endpoint. That is
simple and consistent for this dataset, but should move server-side if the list
becomes paginated.

## 3. Where did you cut corners?

The forms use native controls and report API errors, but photo ratings are
anonymous and can be repeated. Local file storage is appropriat but should become object storage in production. With another day I would add accounts, one-rating-per-user enforcement, thumbnail generation, anda disposable PostgreSQL instance for the API verification script.

## 4. What should we look at first?

Start with the favorite-plates wall on the home page, then read
`app/api/photos/route.ts`. Uploading and rating a plate shows the complete API,
validation, persistence, and UI flow.

---

## Part A: diagnosis and fixes

The planted list bug queried `createdAt`, but PostgreSQL stores the column as
`created_at`. I replaced wildcard queries with explicit columns and aliased
`created_at AS "createdAt"`, which also ensures the shared mapper emits the
required JSON shape. I implemented restaurant `POST`, `PUT`, and `DELETE`,
positive-integer ID handling, full body validation, and centralized safe error
mapping. Invalid bodies return `400`, missing or invalid IDs return `404`, and
case-insensitive duplicate names are database-enforced and return `409`.

---

## Part B: routes

| Method and path | What it does | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/visits` | Lists visits newest-first with restaurant names | `200` + visit array | `500` only for unexpected server failures |
| `POST /api/visits` | Records a restaurant visit | `201` + created visit | `400` invalid body; `404` restaurant missing |
| `GET /api/photos` | Lists food photos with visit details and aggregate ratings | `200` + photo array | `500` only for unexpected failures |
| `POST /api/photos` | Uploads base64-encoded JPG, PNG, or WebP data up to 5 MB | `201` + created photo | `400` invalid file/body; `404` visit missing |
| `POST /api/photos/:id/ratings` | Adds a 1–5 star rating | `200` + updated aggregate | `400` invalid rating; `404` photo missing |
| `DELETE /api/photos/:id` | Deletes a photo, ratings, and uploaded file | `204` | `404` photo missing |
| `DELETE /api/visits/:id` | Deletes a visit and its attached photos | `204` | `404` visit missing |

**`POST /api/visits`**

```jsonc
// request
{
  "restaurantId": 1,
  "date": "2026-09-09",
  "amountSpent": 24.5,
  "notes": "Great burger"
}

// 201 response
{
  "id": 4,
  "restaurantId": 1,
  "date": "2026-09-09",
  "amountSpent": 24.5,
  "notes": "Great burger",
  "createdAt": "2026-09-09T20:00:00.000Z",
  "restaurantName": "The Rusty Spoon"
}
```

## Schema changes

`002_unique_restaurant_names.sql` adds a case- and surrounding-whitespace-
insensitive unique index on restaurant names. This makes Part A duplicate
handling concurrency-safe and lets the shared error handler return `409` for a
database uniqueness violation. `003_food_photos.sql` adds `food_photos` and
`photo_ratings`, both with cascade cleanup and lookup indexes. Run the normal
`npm run migrate`; no other setup is needed.

## How I verified this

Static checks completed successfully with `npm run lint`, `npx tsc --noEmit`,
and `npm run build`. The repeatable live suite also completed **30/30 checks**
against PostgreSQL and removes its temporary restaurant, visit, photo, and file
afterward. Run it while the dev server is active:

```bash
cd client
npm run verify:api
```

It covers every Part A contract row plus malformed JSON, wrong field types,
negative/fractional IDs, duplicates, invalid dates and amounts, missing foreign
keys, photo upload/rating, invalid ratings, and all delete paths.

Equivalent manual requests include:

```bash
./setup.sh
cd client && npm run dev

# Part A reads and ID handling
curl -i http://localhost:3000/api/restaurants
curl -i http://localhost:3000/api/restaurants/1
curl -i http://localhost:3000/api/restaurants/99999
curl -i http://localhost:3000/api/restaurants/abc

# Part A create, invalid input, duplicate, update, and delete
curl -i -X POST http://localhost:3000/api/restaurants -H 'Content-Type: application/json' -d '{"name":"Valid Spot","rating":4.5}'
curl -i -X POST http://localhost:3000/api/restaurants -H 'Content-Type: application/json' -d '{"name":"Out Of Range","rating":6}'
curl -i -X POST http://localhost:3000/api/restaurants -H 'Content-Type: application/json' -d '{"name":"The Rusty Spoon"}'
curl -i -X PUT http://localhost:3000/api/restaurants/1 -H 'Content-Type: application/json' -d '{"name":"The Rusty Spoon","cuisine":"American","address":"12 Main St","rating":4.7}'
curl -i -X DELETE http://localhost:3000/api/restaurants/5

# Part B happy path and failures
curl -i http://localhost:3000/api/visits
curl -i -X POST http://localhost:3000/api/visits -H 'Content-Type: application/json' -d '{"restaurantId":1,"date":"2026-09-09","amountSpent":24.50,"notes":"Great burger"}'
curl -i -X POST http://localhost:3000/api/visits -H 'Content-Type: application/json' -d '{"restaurantId":99999,"date":"2026-09-09","amountSpent":24.50}'
curl -i -X POST http://localhost:3000/api/visits -H 'Content-Type: application/json' -d '{"restaurantId":1,"date":"2026-02-30","amountSpent":-1}'
curl -i http://localhost:3000/api/photos
PHOTO_BASE64=$(base64 < /path/to/food.jpg | tr -d '\n')
curl -i -X POST http://localhost:3000/api/photos -H 'Content-Type: application/json' -d "{\"visitId\":1,\"caption\":\"Perfect crispy edges\",\"mimeType\":\"image/jpeg\",\"imageBase64\":\"$PHOTO_BASE64\"}"
curl -i -X POST http://localhost:3000/api/photos/1/ratings -H 'Content-Type: application/json' -d '{"rating":5}'
curl -i -X POST http://localhost:3000/api/photos/1/ratings -H 'Content-Type: application/json' -d '{"rating":8}'
```

## Known issues / what I'd do next

The visit and photo lists are unpaginated, the total is client-view derived,
ratings are anonymous, and uploaded files live on the app server. A production
deployment should add authentication, object storage, thumbnails, and
pagination. I would also add an "import to Instagram" feature where pics taken and uploaded to the photowall could be directly imported to someones Instagram feed and made to tag each of the restaurants mentioned.
