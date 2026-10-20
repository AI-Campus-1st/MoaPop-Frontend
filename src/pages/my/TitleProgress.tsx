/**
 * 다음 칭호까지 진행바 (components/my-widgets.md 'title-progress' = track + fill + label)
 * 계산은 lib/title.ts getTitleProgress 결과를 받아 그리기만 한다(DB 저장 없음, DEV_RULES 3번).
 * - 문구: "다음 칭호(헛걸음 방지단)까지 55P 남음", 숫자는 number-md
 * - 최고 칭호(300P~): 진행바 가득 + "최고 칭호예요"
 * 사용처: ProfileCard
 */
import { useId } from 'react';
import type { TitleProgress as TitleProgressValue } from '../../lib/title';

interface TitleProgressProps {
  progress: TitleProgressValue;
}

export default function TitleProgress({ progress }: TitleProgressProps) {
  const labelId = useId();
  const percent = Math.round(progress.ratio * 100);

  return (
    <div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-3 w-full overflow-hidden rounded-full bg-surface"
      >
        {/* 0%여도 최소 12px 은 보이게 한다 (my-widgets 'progress-fill' minWidth) */}
        <div className="h-full min-w-3 rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>

      <p id={labelId} className="mt-2 text-body-sm text-ink">
        {progress.isMax || !progress.nextTitle ? (
          '최고 칭호예요'
        ) : (
          <>
            다음 칭호({progress.nextTitle})까지{' '}
            <span className="text-number-md font-bold tabular-nums">{progress.remaining}P</span> 남음
          </>
        )}
      </p>
    </div>
  );
}
