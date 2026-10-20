/**
 * "판매 굿즈" 섹션: SKU 미리보기 가로 스크롤 (pages/popup-detail.md 구조 2)
 * 카드는 사진 + 굿즈명 + 가격만 보여 준다. 상태 띠·제보 버튼은 없다(stock.md '사용하는 화면').
 * 굿즈가 없으면 "아직 등록된 굿즈가 없어요".
 * 사용처: PopupDetailPage
 */
import { Package } from '@phosphor-icons/react';
import type { Sku } from '../../api/types';
import ImageFallback from '../../components/ImageFallback';
import { formatPrice } from '../../lib/format';

function SkuPreviewCard({ sku }: { sku: Sku }) {
  return (
    <li className="w-[120px] shrink-0">
      <ImageFallback
        src={sku.image_url}
        alt={sku.name}
        fallbackIcon={Package}
        fallbackIconSize={32}
        className="aspect-square rounded-lg"
      />
      <p className="mt-2 line-clamp-2 text-sku-name-compact font-bold text-ink">{sku.name}</p>
      <p className="mt-0.5 text-number-md font-bold tabular-nums text-ink">{formatPrice(sku.price)}</p>
    </li>
  );
}

export default function SkuPreviewList({ skus }: { skus: Sku[] }) {
  return (
    <section aria-labelledby="sku-preview-title">
      <h2 id="sku-preview-title" className="font-display text-title-md text-ink">
        판매 굿즈
      </h2>

      {skus.length === 0 ? (
        <p className="mt-3 text-body-sm text-muted">아직 등록된 굿즈가 없어요</p>
      ) : (
        // -mx-4 px-4: 스크롤 영역은 화면 끝까지, 첫 카드는 본문 왼쪽 여백(16px)에서 시작
        <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {skus.map((sku) => (
            <SkuPreviewCard key={sku.id} sku={sku} />
          ))}
        </ul>
      )}
    </section>
  );
}
