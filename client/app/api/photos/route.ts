import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { pool } from '@/db/pool';
import { ApiError, handleError } from '@/lib/errors';
import { toFoodPhoto } from '@/lib/types';

export const runtime = 'nodejs';

const photoSelect = `
  p.id,
  p."visitId",
  p.image_url AS "imageUrl",
  p.caption,
  p.created_at AS "createdAt",
  r.name AS "restaurantName",
  v.date AS "visitDate",
  ROUND(AVG(pr.rating)::numeric, 1) AS "averageRating",
  COUNT(pr.id)::int AS "ratingCount"`;

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT ${photoSelect}
       FROM food_photos p
       JOIN visits v ON v.id = p."visitId"
       JOIN restaurants r ON r.id = v."restaurantId"
       LEFT JOIN photo_ratings pr ON pr."photoId" = p.id
       GROUP BY p.id, r.name, v.date
       ORDER BY p.created_at DESC`
    );
    return NextResponse.json(rows.map(toFoodPhoto));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  let savedPath: string | null = null;
  try {
    const body: unknown = await req.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError(400, 'Request body must be a JSON object');
    }
    const input = body as Record<string, unknown>;
    const visitId = input.visitId;
    const caption = typeof input.caption === 'string' ? input.caption.trim() : '';

    if (typeof visitId !== 'number' || !Number.isSafeInteger(visitId) || visitId <= 0) {
      throw new ApiError(400, 'visitId must be a positive integer');
    }
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = typeof input.mimeType === 'string' ? extensions[input.mimeType] : undefined;
    if (!extension) throw new ApiError(400, 'Photo must be a JPG, PNG, or WebP image');
    if (caption.length > 160) throw new ApiError(400, 'Caption must be 160 characters or fewer');
    if (typeof input.imageBase64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.imageBase64)) {
      throw new ApiError(400, 'Photo data is missing or invalid');
    }

    const imageBuffer = Buffer.from(input.imageBase64, 'base64');
    if (imageBuffer.length === 0 || imageBuffer.length > 5 * 1024 * 1024) {
      throw new ApiError(400, 'Photo must be 5 MB or smaller');
    }
    const signatures = {
      jpg: imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff,
      png: imageBuffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      webp: imageBuffer.subarray(0, 4).toString() === 'RIFF' && imageBuffer.subarray(8, 12).toString() === 'WEBP',
    };
    if (!signatures[extension as keyof typeof signatures]) {
      throw new ApiError(400, 'Photo contents do not match its file type');
    }

    const uploadDirectory = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDirectory, { recursive: true });
    const fileName = `${randomUUID()}.${extension}`;
    savedPath = path.join(uploadDirectory, fileName);
    await writeFile(savedPath, imageBuffer);
    const imageUrl = `/uploads/${fileName}`;

    const { rows } = await pool.query(
      `WITH inserted AS (
         INSERT INTO food_photos ("visitId", image_url, caption)
         VALUES ($1, $2, $3)
         RETURNING *
       )
       SELECT i.id, i."visitId", i.image_url AS "imageUrl", i.caption,
              i.created_at AS "createdAt", r.name AS "restaurantName",
              v.date AS "visitDate", NULL AS "averageRating", 0 AS "ratingCount"
       FROM inserted i
       JOIN visits v ON v.id = i."visitId"
       JOIN restaurants r ON r.id = v."restaurantId"`,
      [visitId, imageUrl, caption || null]
    );
    return NextResponse.json(toFoodPhoto(rows[0]), { status: 201 });
  } catch (err) {
    if (savedPath) await unlink(savedPath).catch(() => undefined);
    return handleError(err);
  }
}
