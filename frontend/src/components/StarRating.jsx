export default function StarRating({ rating = 0, onRatingChange, size = 20 }) {
  const stars = [1, 2, 3, 4, 5];
  
  return (
    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
      {stars.map((star) => {
        const isFilled = star <= rating;
        return (
          <span
            key={star}
            onClick={() => onRatingChange && onRatingChange(star)}
            style={{
              cursor: onRatingChange ? 'pointer' : 'default',
              fontSize: `${size}px`,
              color: isFilled ? '#f59e0b' : '#cbd5e1',
              transition: 'color 0.2s ease, transform 0.2s ease',
            }}
            className={onRatingChange ? 'star-interactive' : ''}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
