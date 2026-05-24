import Image from 'next/image';
import { useState } from 'react';

type ProductMediaProps = {
  value: string;
  alt: string;
  className?: string;
};

function isImageUrl(value: string) {
  return /^https?:\/\/.+/i.test(value);
}

export default function ProductMedia({ value, alt, className = "" }: ProductMediaProps) {
  const [imgError, setImgError] = useState(false);

  if (isImageUrl(value) && !imgError) {
    return (
      <span className={`product-media product-media-image ${className}`}>
        <Image
          src={value}
          alt={alt}
          loading="lazy"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  return (
    <span className={`product-media product-media-emoji ${className}`} aria-label={alt}>
      {value}
    </span>
  );
}
