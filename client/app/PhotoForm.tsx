'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VisitWithRestaurant } from '@/lib/types';

export function PhotoForm({ visits }: { visits: VisitWithRestaurant[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setMessage('');
    try {
      const form = new FormData(formElement);
      const photo = form.get('photo');
      if (!(photo instanceof File) || photo.size === 0) throw new Error('Choose a photo first');
      if (photo.size > 5 * 1024 * 1024) throw new Error('Photo must be 5 MB or smaller');

      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read that photo'));
        reader.readAsDataURL(photo);
      });
      const base64 = imageData.split(',', 2)[1];

      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: Number(form.get('visitId')),
          caption: form.get('caption') || null,
          mimeType: photo.type,
          imageBase64: base64,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to share photo');
      formElement.reset();
      setMessage('Photo added to the table.');
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unable to share photo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="photo-form">
      <div>
        <span className="eyebrow">From your camera roll</span>
        <h3>Share a plate worth remembering</h3>
      </div>
      <label>Which visit?
        <select name="visitId" required defaultValue="">
          <option value="" disabled>Pick a meal</option>
          {visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.restaurantName} · {visit.date}</option>)}
        </select>
      </label>
      <label>Food photo
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
      </label>
      <label>Caption <span>(optional)</span>
        <input name="caption" maxLength={160} placeholder="The crispy edges were everything…" />
      </label>
      {message && <p role="status" className="form-message">{message}</p>}
      <button disabled={saving || visits.length === 0}>{saving ? 'Sharing…' : 'Add to the wall'}</button>
    </form>
  );
}
