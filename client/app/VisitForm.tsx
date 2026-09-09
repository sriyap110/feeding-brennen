'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Restaurant } from '@/lib/types';

export function VisitForm({ restaurants }: { restaurants: Restaurant[] }) {
  const router = useRouter();
  const [restaurantOptions, setRestaurantOptions] = useState(restaurants);
  const [restaurantId, setRestaurantId] = useState('');
  const [addingRestaurant, setAddingRestaurant] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingRestaurant, setSavingRestaurant] = useState(false);

  async function addRestaurant() {
    const name = (document.getElementById('new-restaurant-name') as HTMLInputElement)?.value;
    const cuisine = (document.getElementById('new-restaurant-cuisine') as HTMLInputElement)?.value;
    if (!name?.trim()) return setError('Enter a restaurant name');
    setSavingRestaurant(true);
    setError('');
    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cuisine: cuisine || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add restaurant');
      setRestaurantOptions((current) => [...current, result]);
      setRestaurantId(String(result.id));
      setAddingRestaurant(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add restaurant');
    } finally { setSavingRestaurant(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(''); setSaving(true);
    const form = new FormData(formElement);
    const amount = String(form.get('amountSpent') || '');
    try {
      const response = await fetch('/api/visits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: Number(restaurantId), date: form.get('date'), amountSpent: amount ? Number(amount) : null, notes: form.get('notes') || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save visit');
      formElement.reset(); setRestaurantId(''); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save visit');
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit} className="visit-form">
      <div className="visit-form-grid">
        <label>Restaurant
          <select name="restaurantId" required value={restaurantId} onChange={(event) => setRestaurantId(event.target.value)}>
            <option value="">Choose one</option>
            {restaurantOptions.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
          <button className="text-button" type="button" onClick={() => setAddingRestaurant((open) => !open)}>{addingRestaurant ? 'Cancel' : '+ Add a new restaurant'}</button>
        </label>
        <label>Date<input name="date" type="date" required /></label>
        <label>Amount spent<input name="amountSpent" type="number" min="0" step="0.01" placeholder="0.00" /></label>
        <label>Notes<input name="notes" maxLength={500} placeholder="What stood out?" /></label>
      </div>
      {addingRestaurant && <div className="new-restaurant-panel"><label>Restaurant name<input id="new-restaurant-name" maxLength={120} placeholder="New favorite spot" /></label><label>Cuisine<input id="new-restaurant-cuisine" maxLength={80} placeholder="Thai, Italian…" /></label><button type="button" onClick={addRestaurant} disabled={savingRestaurant}>{savingRestaurant ? 'Adding…' : 'Add restaurant'}</button></div>}
      {error && <p role="alert" className="form-message error">{error}</p>}
      <button disabled={saving || restaurantOptions.length === 0}>{saving ? 'Saving…' : 'Record visit'}</button>
    </form>
  );
}
