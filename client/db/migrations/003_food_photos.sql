CREATE TABLE IF NOT EXISTS food_photos (
  id          SERIAL PRIMARY KEY,
  "visitId"   INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photo_ratings (
  id          SERIAL PRIMARY KEY,
  "photoId"   INTEGER NOT NULL REFERENCES food_photos(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_photos_visit_id ON food_photos ("visitId");
CREATE INDEX IF NOT EXISTS idx_photo_ratings_photo_id ON photo_ratings ("photoId");
