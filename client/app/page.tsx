import Image from 'next/image';
import { getPhotos, getRestaurants, getVisits } from '@/lib/apiClient';
import { PhotoForm } from './PhotoForm';
import { PhotoRating } from './PhotoRating';
import { VisitForm } from './VisitForm';
import { DeleteButton } from './DeleteButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [restaurants, visits, photos] = await Promise.all([
    getRestaurants(),
    getVisits(),
    getPhotos(),
  ]);
  const totalSpent = visits.reduce((sum, visit) => sum + (visit.amountSpent ?? 0), 0);

  return (
    <div className="journal">
      <section className="hero">
        <Image src="/images/food-table-hero.png" alt="A table covered with pasta, dumplings, vegetables, and drinks after a shared meal" fill priority sizes="(max-width: 900px) 100vw, 1200px" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow light">Brennen’s table diary</p>
          <h1>Good meals deserve<br />a second look.</h1>
          <p>The places, plates, and little details we want to remember.</p>
        </div>
        <div className="hero-stamp"><strong>${totalSpent.toFixed(2)}</strong><span>spent across {visits.length} meals</span></div>
      </section>

      <section className="intro-grid" id="photos">
        <div>
          <p className="eyebrow">The camera eats first</p>
          <h2>Our favorite plates</h2>
          <p className="section-note">A shared wall of things that tasted as good as they looked. Tap a star to leave your rating.</p>
        </div>
        <PhotoForm visits={visits} />
      </section>

      <section className="photo-wall">
        {photos.length === 0 ? (
          <div className="photo-empty"><span>✦</span><h3>The wall is hungry.</h3><p>Add a photo from one of your visits to start the collection.</p></div>
        ) : photos.map((photo, index) => (
          <article className={`photo-card photo-card-${index % 3}`} key={photo.id}>
            <div className="photo-frame">
              <Image src={photo.imageUrl} alt={photo.caption || `Food from ${photo.restaurantName}`} fill sizes="(max-width: 700px) 100vw, 45vw" />
            </div>
            <div className="photo-meta">
              <div><h3>{photo.restaurantName}</h3><p>{photo.caption || 'No caption—just a very good plate.'}</p></div>
              <time>{photo.visitDate}</time>
            </div>
            <PhotoRating photoId={photo.id} average={photo.averageRating} count={photo.ratingCount} />
            <DeleteButton endpoint={`/api/photos/${photo.id}`} label="Photo" />
          </article>
        ))}
      </section>

      <section className="ledger-section">
        <div className="section-heading"><div><p className="eyebrow">Keep the receipt</p><h2>Log a meal</h2></div><p>Great, ordinary, expensive, unforgettable—put it all down.</p></div>
        <VisitForm restaurants={restaurants} />
      </section>

      <section className="visits-section" id="visits">
        <div className="section-heading"><div><p className="eyebrow">Lately</p><h2>Meals we’ve had</h2></div><span>{visits.length} entries</span></div>
        <div className="visit-ledger">
          {visits.map((visit, index) => (
            <article key={visit.id}>
              <span className="visit-number">{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{visit.restaurantName}</h3><p>{visit.notes || 'A meal worth logging.'}</p></div>
              <time>{visit.date}</time>
              <strong>{visit.amountSpent === null ? '—' : `$${visit.amountSpent.toFixed(2)}`}</strong>
              <DeleteButton endpoint={`/api/visits/${visit.id}`} label="Visit" />
            </article>
          ))}
        </div>
      </section>

      <section className="directory-section">
        <div className="section-heading"><div><p className="eyebrow">The shortlist</p><h2>Places to return to</h2></div></div>
        <div className="restaurant-grid">
          {restaurants.map((restaurant) => (
            <article key={restaurant.id}><span>{restaurant.cuisine || 'Restaurant'}</span><h3>{restaurant.name}</h3><p>{restaurant.address || 'Address coming soon'}</p><strong>{restaurant.rating === null ? 'Not rated' : `${restaurant.rating} / 5`}</strong><DeleteButton endpoint={`/api/restaurants/${restaurant.id}`} label="Restaurant" /></article>
          ))}
        </div>
      </section>
    </div>
  );
}
