import { ApiError } from './errors';

export interface RestaurantInput {
  name: string;
  cuisine: string | null;
  address: string | null;
  rating: number | null;
}

const allowedFields = new Set(['name', 'cuisine', 'address', 'rating']);

function optionalText(
  value: unknown,
  field: string,
  maxLength: number
): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} must be a string or null`);
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new ApiError(400, `${field} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

export function parseRestaurantInput(body: unknown): RestaurantInput {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  const unknownField = Object.keys(input).find((key) => !allowedFields.has(key));
  if (unknownField) {
    throw new ApiError(400, `Unknown field: ${unknownField}`);
  }

  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new ApiError(400, 'name is required and must be a non-empty string');
  }
  const name = input.name.trim();
  if (name.length > 120) {
    throw new ApiError(400, 'name must be 120 characters or fewer');
  }

  if (
    input.rating !== undefined &&
    input.rating !== null &&
    (typeof input.rating !== 'number' ||
      !Number.isFinite(input.rating) ||
      input.rating < 0 ||
      input.rating > 5)
  ) {
    throw new ApiError(400, 'rating must be a number between 0 and 5, or null');
  }

  return {
    name,
    cuisine: optionalText(input.cuisine, 'cuisine', 80),
    address: optionalText(input.address, 'address', 240),
    rating: input.rating === undefined ? null : (input.rating as number | null),
  };
}

export function parseRestaurantId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
