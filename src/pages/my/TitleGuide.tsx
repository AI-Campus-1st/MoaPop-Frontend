/**
 * 모덕우 칭호 안내 (pages/my.md 3번, components/my-widgets.md 'title-guide')
 * 4단계 구간표. 내 칭호 행은 brand-soft 면 + 번호 원 brand + [내 칭호] 작은 칩.
 * 하단: Info 아이콘 + "포인트는 차감되지 않으며 …" 안내.
 * 칭호 이름·구간은 lib/title.ts 에서만 정해지므로 여기서 다시 적지 않고 그 결과로 행을 만든다.
 * 사용처: MyPage
 */
import { Info } from '@phosphor-icons/react';
import { getTitleProgress } from '../../lib/title';

interface TierRow {
  title: string;
  min: number;
  /** 구간 끝 포인트. 최고 칭호면 null */
  max: number | null;
}

/**
 * 0P 부터 getTitleProgress 를 따라가며 구간을 만든다.
 * 각 구간의 시작 포인트 + remaining = 다음 구간 시작. 최고 칭호(isMax)에서 멈춘다.
 */
function buildTierRows(): TierRow[] {
  const rows: TierRow[] = [];
  let min = 0;
  // 칭호는 4개뿐이지만 title.ts 가 잘못 바뀌어도 무한 반복하지 않게 상한을 둔다
  for (let guard = 0; guard < 20; guard += 1) {
    const progress = getTitleProgress(min);
    if (progress.isMax) {
      rows.push({ title: progress.title, min, max: null });
      break;
    }
    const nextMin = min + progress.remaining;
    rows.push({ title: progress.title, min, max: nextMin - 1 });
    min = nextMin;
  }
  return rows;
}

const TIER_ROWS = buildTierRows();

/** 구간 표기: '0~29P', '300P~' */
function formatRange(row: TierRow): string {
  return row.max === null ? `${row.min}P~` : `${row.min}~${row.max}P`;
}

interface TitleGuideProps {
  /** 지금 내 칭호 이름 */
  currentTitle: string;
}

export default function TitleGuide({ currentTitle }: TitleGuideProps) {
  return (
    <section aria-labelledby="title-guide-heading" className="rounded-lg border border-hairline bg-card p-4">
      <h2 id="title-guide-heading" className="font-display text-title-md text-ink">
        모덕우 칭호 안내
      </h2>

      <ol className="mt-3 flex flex-col gap-1">
        {TIER_ROWS.map((row, index) => {
          const isCurrent = row.title === currentTitle;
          return (
            <li
              key={row.title}
              aria-current={isCurrent ? 'true' : undefined}
              className={`flex h-11 items-center gap-3 rounded-full px-2.5 ${isCurrent ? 'bg-brand-soft' : ''}`}
            >
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold tabular-nums text-ink ${
                  isCurrent ? 'bg-brand' : 'bg-surface'
                }`}
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-body-sm text-ink">{row.title}</span>
                {isCurrent && (
                  <span className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-card px-2 text-caption font-bold text-ink">
                    내 칭호
                  </span>
                )}
              </span>
              <span className="ml-auto shrink-0 text-number-md text-muted tabular-nums">{formatRange(row)}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 flex gap-1.5 text-caption text-muted">
        <Info size={16} weight="regular" className="mt-px shrink-0" aria-hidden />
        <span className="break-keep">포인트는 차감되지 않으며 오직 집단지성을 위한 제보 명예로만 영구 누적돼요!</span>
      </p>
    </section>
  );
}
