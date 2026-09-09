import { NextResponse } from 'next/server';
import { pool } from '@/db/pool';
import { handleError } from '@/lib/errors';
import { toVisitWithRestaurant } from '@/lib/types';
import { parseVisitInput } from '@/lib/visitValidation';

const visitFields = `
  v.id,
  v."restaurantId",
  v.date,
  v."amountSpent",
  v.notes,
  v.created_at AS "createdAt",
  r.name AS "restaurantName"`;

/** GET /api/visits - newest meals first, including the restaurant name. */
export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT ${visitFields}
       FROM visits v
       JOIN restaurants r ON r.id = v."restaurantId"
       ORDER BY v.date DESC, v.id DESC`
    );
    return NextResponse.json(rows.map(toVisitWithRestaurant));
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/visits - record a meal and return it with its restaurant name. */
export async function POST(req: Request) {
  try {
    const input = parseVisitInput(await req.json());
    const { rows } = await pool.query(
      `WITH inserted AS (
         INSERT INTO visits ("restaurantId", date, "amountSpent", notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *
       )
       SELECT
         i.id,
         i."restaurantId",
         i.date,
         i."amountSpent",
         i.notes,
         i.created_at AS "createdAt",
         r.name AS "restaurantName"
       FROM inserted i
       JOIN restaurants r ON r.id = i."restaurantId"`,
      [input.restaurantId, input.date, input.amountSpent, input.notes]
    );

    return NextResponse.json(toVisitWithRestaurant(rows[0]), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
