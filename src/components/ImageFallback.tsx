/**
 * 이미지 + '이미지 없음' 대체 면
 * 주소가 비었거나 불러오기에 실패하면 surface 면 가운데에 아이콘(disabled-text)을 보여 준다.
 * (stock.md 'sku-image.fallback': Package 32px. 대표 이미지는 Storefront 48px, popup-detail.md)
 * 크기·곡률은 부모가 className 으로 정한다.
 * 사용처: PopupDetailPage (대표 이미지), SkuPreviewList (굿즈 사진), PopupListItem (찜 목록 썸네일),
 *         stock-grid SkuCard (굿즈 사진, 품절은 imgClassName 으로 채도 낮춤)
 */
import { useEffect, useState } from 'react';
import type { Icon } from '@phosphor-icons/react';

interface ImageFallbackProps {
  src: string;
  alt: string;
  /** 이미지가 없을 때 보여 줄 아이콘 */
  fallbackIcon: Icon;
  fallbackIconSize: number;
  /** 바깥 틀(크기·곡률) */
  className?: string;
  /** 이미지에만 거는 클래스 (예: 품절 채도 낮춤) */
  imgClassName?: string;
}

export default function ImageFallback({
  src,
  alt,
  fallbackIcon: FallbackIcon,
  fallbackIconSize,
  className = '',
  imgClassName = '',
}: ImageFallbackProps) {
  const [failed, setFailed] = useState(false);

  // 주소가 바뀌면 다시 불러와 본다
  useEffect(() => setFailed(false), [src]);

  const showImage = src !== '' && !failed;

  return (
    <div className={`overflow-hidden bg-surface ${className}`}>
      {showImage ? (
        <img src={src} alt={alt} onError={() => setFailed(true)} className={`h-full w-full object-cover ${imgClassName}`} />
      ) : (
        // 대체 면은 꾸밈이므로 alt 대신 role="img" 로 이름만 알린다
        <div role="img" aria-label={alt} className="flex h-full w-full items-center justify-center">
          <FallbackIcon size={fallbackIconSize} weight="regular" className="text-disabled-text" aria-hidden />
        </div>
      )}
    </div>
  );
}
