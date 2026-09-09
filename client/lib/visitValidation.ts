import { ApiError } from './errors';

export interface VisitInput {
  restaurantId: number;
  date: string;
  amountSpent: number | null;
  notes: string | null;
}

const allowedFields = new Set(['restaurantId', 'date', 'amountSpent', 'notes']);

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseVisitInput(body: unknown): VisitInput {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const unknownField = Object.keys(input).find((key) => !allowedFields.has(key));
  if (unknownField) throw new ApiError(400, `Unknown field: ${unknownField}`);

  if (!Number.isSafeInteger(input.restaurantId) || (input.restaurantId as number) <= 0) {
    throw new ApiError(400, 'restaurantId must be a positive integer');
  }
  if (typeof input.date !== 'string' || !isCalendarDate(input.date)) {
    throw new ApiError(400, 'date must be a valid calendar date in YYYY-MM-DD format');
  }
  if (
    input.amountSpent !== undefined &&
    input.amountSpent !== null &&
    (typeof input.amountSpent !== 'number' ||
      !Number.isFinite(input.amountSpent) ||
      input.amountSpent < 0 ||
      input.amountSpent > 99999999.99 ||
      Math.abs(Math.round(input.amountSpent * 100) - input.amountSpent * 100) > 1e-8)
  ) {
    throw new ApiError(400, 'amountSpent must be a non-negative amount with at most two decimals');
  }

  if (input.notes !== undefined && input.notes !== null && typeof input.notes !== 'string') {
    throw new ApiError(400, 'notes must be a string or null');
  }
  const notes = typeof input.notes === 'string' ? input.notes.trim() : null;
  if (notes && notes.length > 500) {
    throw new ApiError(400, 'notes must be 500 characters or fewer');
  }

  return {
    restaurantId: input.restaurantId as number,
    date: input.date,
    amountSpent: input.amountSpent === undefined ? null : (input.amountSpent as number | null),
    notes: notes || null,
  };
}
