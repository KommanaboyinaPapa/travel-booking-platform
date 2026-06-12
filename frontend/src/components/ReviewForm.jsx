import { useState } from 'react';
import StarRating from './StarRating.jsx';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export default function ReviewForm({ entityKey, onSubmitReview, submitting, error, success }) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setFileError('');

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFileError('Please choose an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('Photo upload is limited to 5 MB.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFileError('');

    let photoUrl = null;
    if (selectedFile) {
      photoUrl = await fileToDataUrl(selectedFile);
    }

    const didReset = await onSubmitReview({
      rating,
      reviewText,
      photoUrl,
    });

    if (didReset) {
      setRating(5);
      setReviewText('');
      setSelectedFile(null);
      setPreviewUrl('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="review-form-modern">
      <p className="review-form-title">Leave a Review</p>

      {error && <div className="alert alert-error" style={{ fontSize: '13px', padding: '10px 14px' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ fontSize: '13px', padding: '10px 14px' }}>{success}</div>}
      {fileError && <div className="alert alert-error" style={{ fontSize: '13px', padding: '10px 14px' }}>{fileError}</div>}

      <div className="form-field" style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Your Rating</label>
        <div style={{ marginTop: '6px' }}>
          <StarRating rating={rating} onRatingChange={setRating} size={26} />
        </div>
      </div>

      <div className="form-field" style={{ marginBottom: '14px' }}>
        <label htmlFor={`review-text-${entityKey}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Review Comments</label>
        <textarea
          id={`review-text-${entityKey}`}
          rows="4"
          placeholder="Tell others about your experience..."
          value={reviewText}
          onChange={(event) => setReviewText(event.target.value)}
          style={{ fontSize: '0.85rem' }}
          required
        />
      </div>

      <div className="form-field" style={{ marginBottom: '16px' }}>
        <label htmlFor={`review-photo-${entityKey}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Photo Upload (Optional)</label>
        <input
          id={`review-photo-${entityKey}`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ fontSize: '0.85rem' }}
        />
        {previewUrl && (
          <div style={{ marginTop: '8px' }}>
            <img
              src={previewUrl}
              alt="Selected review upload preview"
              className="review-thumbnail"
              style={{ width: '100px', height: '100px' }}
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        className="button button-primary"
        style={{ padding: '10px 20px', fontSize: '0.85rem', width: '100%' }}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
