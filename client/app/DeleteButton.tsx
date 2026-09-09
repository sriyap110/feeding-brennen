'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteButton({ endpoint, label }: { endpoint: string; label: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (!window.confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Could not delete ${label.toLowerCase()}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not delete ${label.toLowerCase()}`);
      setDeleting(false);
    }
  }

  return <div className="delete-wrap"><button type="button" className="delete-button" onClick={remove} disabled={deleting}>{deleting ? 'Deleting…' : `Delete ${label}`}</button>{error && <span>{error}</span>}</div>;
}
