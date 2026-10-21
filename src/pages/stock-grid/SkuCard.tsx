/**
 * SKU 카드 (components/stock.md 'sku-card', 'status-band-*', 'sku-card-soldout')
 * 흰 카드 안에 사진(하단에 상태 띠) → 굿즈명(2줄) → 가격 → 하단 버튼을 쌓는다. 색은 상태 띠에만 쓴다.
 * 품절: 사진만 채도·투명도를 낮추고(상태 띠는 원래 색), 굿즈명·가격은 disabled-text. 취소선 없음.
 * 가격 줄 오른쪽에 "제보 N명"(지금 상태로 바뀐 뒤 그 상태를 제보한 사람 수, 0명이면 숨김. 2026-10-16 사용자 결정).
 * flashKey 가 바뀌면 update-flash(카드 면 brand-soft → 흰 면, 상태 띠 살짝 커짐)를 다시 재생한다.
 * 하단 버튼은 footer 로 받는다. 인증·제보 상태에 따라 고르는 일은 화면(StockGridPage)이 한다.
 * 사용처: StockGridPage
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Package } from '@phosphor-icons/react';
import type { SkuStatus, StockSku } from '../../api/types';
import ImageFallback from '../../components/ImageFallback';
import { formatPrice } from '../../lib/format';
import { SKU_STATUS_STYLE } from '../../lib/skuStatus';
import { useOfficialImage } from '../../lib/useOfficialImage';

/** 사진 하단 상태 띠: 불투명 채움 + 아이콘 + 라벨 */
function StatusBand({ status, flashing }: { status: SkuStatus; flashing: boolean }) {
  const { label, icon: StatusIcon, fillClass, iconClass } = SKU_STATUS_STYLE[status];

  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex h-[34px] items-center justify-center gap-1.5 text-chip font-bold text-ink ${fillClass} ${
        flashing ? 'update-flash-band' : ''
      }`}
    >
      <StatusIcon size={16} weight="fill" className={iconClass} aria-hidden />
      {label}
    </div>
  );
}

/**
 * flashKey 가 바뀔 때마다 true 로 켜지는 표시. 애니메이션이 끝나면 화면이 끈다.
 * 연달아 바뀌면 한 번 껐다가 다음 프레임에 다시 켜서 처음부터 재생한다 (카드를 다시 만들지 않아 버튼 포커스가 유지된다).
 */
function useFlash(flashKey: number): [boolean, () => void] {
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (flashKey === 0) return;
    setFlashing(false);
    let inner = 0;
    // 두 프레임을 기다려야 꺼진 상태가 실제로 그려진 뒤 다시 켜진다
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setFlashing(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [flashKey]);

  return [flashing, () => setFlashing(false)];
}

interface SkuCardProps {
  sku: StockSku;
  /** 카드 하단에 고정할 버튼 ([제보] 류) */
  footer: ReactNode;
  /** 값이 바뀔 때마다 1씩 늘어나는 번호. 0 이면 번쩍이지 않는다 */
  flashKey?: number;
}

export default function SkuCard({ sku, footer, flashKey = 0 }: SkuCardProps) {
  const soldout = sku.status === 'soldout';
  // 굿즈 사진: image_url → 공식 게시물 이미지 → 대체 아이콘 순(API_spec IMG-1)
  const imageSrc = useOfficialImage('sku', sku.id, sku.image_url);
  const textColor = soldout ? 'text-disabled-text' : 'text-ink';
  const [flashing, stopFlash] = useFlash(flashKey);

  return (
    // h-full: 같은 행의 카드 높이를 맞추고, mt-auto 로 버튼을 카드 바닥에 붙인다
    <article
      className={`flex h-full w-full flex-col rounded-lg border border-hairline bg-card p-2.5 ${flashing ? 'update-flash' : ''}`}
      // 상태 띠의 짧은 애니메이션 끝은 무시하고, 카드 면의 1.2초가 끝날 때 끈다
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) stopFlash();
      }}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg">
        {/* 사진은 굿즈명과 겹치므로 스크린리더에서 숨긴다. 상태 띠는 읽힌다 */}
        <div className="h-full w-full" aria-hidden>
          <ImageFallback
            src={imageSrc}
            alt={sku.name}
            fallbackIcon={Package}
            fallbackIconSize={32}
            className="h-full w-full"
            imgClassName={soldout ? 'grayscale-[0.85] opacity-70' : ''}
          />
        </div>
        <StatusBand status={sku.status} flashing={flashing} />
      </div>

      <p className={`mt-2 line-clamp-2 text-sku-name-compact font-bold ${textColor}`}>{sku.name}</p>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className={`text-number-md font-bold tabular-nums ${textColor}`}>{formatPrice(sku.price)}</p>
        {/* 품절 카드에서도 muted 유지: 인원 수는 신뢰도 정보라 흐리게 하지 않는다 */}
        {sku.reportCount > 0 && (
          <span className="shrink-0 text-caption text-muted tabular-nums">제보 {sku.reportCount}명</span>
        )}
      </div>

      <div className="mt-auto pt-2.5">{footer}</div>
    </article>
  );
}
