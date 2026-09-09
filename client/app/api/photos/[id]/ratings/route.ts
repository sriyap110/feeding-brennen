import { NextResponse } from 'next/server';
import { pool } from '@/db/pool';
import { ApiError, handleError } from '@/lib/errors';
import { parseRestaurantId } from '@/lib/restaurantValidation';

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const photoId = parseRestaurantId(params.id);
  if (photoId === null) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  try {
    const body: unknown = await req.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError(400, 'Request body must be a JSON object');
    }
    const value = (body as Record<string, unknown>).rating;
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) {
      throw new ApiError(400, 'rating must be an integer between 1 and 5');
    }

    const inserted = await pool.query(
      `INSERT INTO photo_ratings ("photoId", rating)
       SELECT id, $2 FROM food_photos WHERE id = $1
       RETURNING id`,
      [photoId, value]
    );
    if (inserted.rowCount === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const { rows } = await pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 1) AS "averageRating",
              COUNT(id)::int AS "ratingCount"
       FROM photo_ratings WHERE "photoId" = $1`,
      [photoId]
    );
    return NextResponse.json({
      averageRating: Number(rows[0].averageRating),
      ratingCount: Number(rows[0].ratingCount),
    });
  } catch (err) {
    return handleError(err);
  }
}
