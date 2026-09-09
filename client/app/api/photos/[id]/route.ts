import { unlink } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { pool } from '@/db/pool';
import { handleError } from '@/lib/errors';
import { parseRestaurantId } from '@/lib/restaurantValidation';

export const runtime = 'nodejs';
type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const id = parseRestaurantId(params.id);
  if (id === null) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  try {
    const { rows } = await pool.query('DELETE FROM food_photos WHERE id = $1 RETURNING image_url', [id]);
    if (rows.length === 0) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    const fileName = path.basename(String(rows[0].image_url));
    await unlink(path.join(process.cwd(), 'public', 'uploads', fileName)).catch(() => undefined);
    return new NextResponse(null, { status: 204 });
  } catch (err) { return handleError(err); }
}
