'use client';

import { useState } from 'react';

export function PhotoRating({ photoId, average, count }: { photoId: number; average: number | null; count: number }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [currentAverage, setCurrentAverage] = useState(average);
  const [currentCount, setCurrentCount] = useState(count);
  const highlighted = hovered || selected || Math.round(currentAverage ?? 0);

  async function rate(rating: number) {
    setSaving(true);
    setSelected(rating);
    setError('');
    try {
      const response = await fetch(`/api/photos/${photoId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save rating');
      setCurrentAverage(result.averageRating);
      setCurrentCount(result.ratingCount);
    } catch (err) {
      setSelected(0);
      setError(err instanceof Error ? err.message : 'Could not save rating');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rating-row">
      <span className="rating-summary">
        {hovered ? `${hovered} out of 5` : currentAverage === null ? 'Choose your rating' : `${currentAverage} from ${currentCount} ${currentCount === 1 ? 'rating' : 'ratings'}`}
      </span>
      <div className="rating-buttons" role="radiogroup" aria-label="Rate this food photo" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            className={value <= highlighted ? 'active' : ''}
            key={value}
            type="button"
            role="radio"
            aria-checked={selected === value}
            disabled={saving}
            onMouseEnter={() => setHovered(value)}
            onFocus={() => setHovered(value)}
            onBlur={() => setHovered(0)}
            onClick={() => rate(value)}
            aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
          >★</button>
        ))}
      </div>
      {selected > 0 && !saving && !error && <span className="rating-saved">Your rating: {selected}/5</span>}
      {error && <span className="rating-error">{error}</span>}
    </div>
  );
}
