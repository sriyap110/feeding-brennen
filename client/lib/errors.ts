import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type DatabaseError = Error & { code?: string };

/**
 * Central error -> HTTP response mapper for the API route handlers. Call it
 * from a route's `catch` block so error handling lives in one place:
 *
 *   try {
 *     ...
 *   } catch (err) {
 *     return handleError(err);
 *   }
 *
 * Expected application and database errors become safe 4xx responses. Only
 * unexpected failures are logged; their details never cross the API boundary.
 */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const databaseError = err as DatabaseError;
  if (databaseError?.code === '23505') {
    return NextResponse.json(
      { error: 'A restaurant with that name already exists' },
      { status: 409 }
    );
  }

  if (databaseError?.code === '23503') {
    return NextResponse.json({ error: 'Referenced record not found' }, { status: 404 });
  }

  console.error('Unhandled API error:', err);

  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
