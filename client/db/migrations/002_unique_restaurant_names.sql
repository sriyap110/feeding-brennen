-- Names identify restaurants in this small tracker. Enforce the duplicate rule
-- in PostgreSQL as well as the API so concurrent requests cannot create twins.
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_name_unique
  ON restaurants (LOWER(BTRIM(name)));
