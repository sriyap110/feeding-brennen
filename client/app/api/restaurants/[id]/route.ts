import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { pool } from '@/db/pool';
import { handleError } from '@/lib/errors';
import { toRestaurant } from '@/lib/types';
import { parseRestaurantId, parseRestaurantInput } from '@/lib/restaurantValidation';

type Params = { params: { id: string } };
export const runtime = 'nodejs';

/**
 * GET /api/restaurants/:id
 * Returns a single restaurant, or 404 if it doesn't exist.
 */
export async function GET(_req: Request, { params }: Params) {
  const id = parseRestaurantId(params.id);
  if (id === null) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, cuisine, address, rating, created_at AS "createdAt"
       FROM restaurants WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(toRestaurant(rows[0]));
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PUT /api/restaurants/:id
 * Update an existing restaurant.
 *
 * Replaces the editable fields and returns the updated record.
 */
export async function PUT(req: Request, { params }: Params) {
  const id = parseRestaurantId(params.id);
  if (id === null) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  try {
    const input = parseRestaurantInput(await req.json());
    const { rows } = await pool.query(
      `UPDATE restaurants
       SET name = $1, cuisine = $2, address = $3, rating = $4
       WHERE id = $5
       RETURNING id, name, cuisine, address, rating, created_at AS "createdAt"`,
      [input.name, input.cuisine, input.address, input.rating, id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json(toRestaurant(rows[0]));
  } catch (err) {
    return handleError(err);
  }
}

/**
 * DELETE /api/restaurants/:id
 * Delete a restaurant.
 *
 * Deletes the restaurant. Its visits are removed by the schema's cascade rule.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const id = parseRestaurantId(params.id);
  if (id === null) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
  }

  try {
    const photos = await pool.query(
      `SELECT p.image_url FROM food_photos p
       JOIN visits v ON v.id = p."visitId"
       WHERE v."restaurantId" = $1`,
      [id]
    );
    const result = await pool.query('DELETE FROM restaurants WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    await Promise.all(
      photos.rows.map((photo) =>
        unlink(path.join(process.cwd(), 'public', 'uploads', path.basename(String(photo.image_url)))).catch(() => undefined)
      )
    );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleError(err);
  }
}
