type ProductMediaProps = {
  value: string;
  alt: string;
  className?: string;
};

function isImageUrl(value: string) {
  return /^https?:\/\/.+/i.test(value);
}

export default function ProductMedia({ value, alt, className = "" }: ProductMediaProps) {
  if (isImageUrl(value)) {
    return (
      <span className={`product-media product-media-image ${className}`}>
        <img src={value} alt={alt} loading="lazy" />
      </span>
    );
  }

  return (
    <span className={`product-media product-media-emoji ${className}`} aria-label={alt}>
      {value}
    </span>
  );
}
