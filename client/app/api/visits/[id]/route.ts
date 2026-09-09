import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { pool } from '@/db/pool';
import { handleError } from '@/lib/errors';
import { parseRestaurantId } from '@/lib/restaurantValidation';

type Params = { params: { id: string } };
export const runtime = 'nodejs';

export async function DELETE(_req: Request, { params }: Params) {
  const id = parseRestaurantId(params.id);
  if (id === null) return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
  try {
    const photos = await pool.query('SELECT image_url FROM food_photos WHERE "visitId" = $1', [id]);
    const result = await pool.query('DELETE FROM visits WHERE id = $1', [id]);
    if (result.rowCount === 0) return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    await Promise.all(photos.rows.map((photo) => unlink(path.join(process.cwd(), 'public', 'uploads', path.basename(String(photo.image_url)))).catch(() => undefined)));
    return new NextResponse(null, { status: 204 });
  } catch (err) { return handleError(err); }
}
