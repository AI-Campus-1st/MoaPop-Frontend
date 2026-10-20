/**
 * MY 상단 프로필 카드 (pages/my.md 1번, components/my-widgets.md 'profile-card')
 * 인사 "{닉네임} 모덕우님" → 누적 포인트 + 현재 칭호 칩 → 다음 칭호까지 진행바.
 * - 인사는 닉네임(바뀌는 글자)이 들어가서 꾹꾹체가 아니라 Pretendard 20px/700 (title-md 크기만, 사용자 결정)
 * - 보조 한 줄은 쓰지 않는다 (사용자 결정 2026-10-16)
 * - 인사는 h2 (화면의 h1 은 MyPage 의 제목 "마이페이지")
 * 값은 세션에서 바로 받으므로 로딩 상태가 없다.
 * 사용처: MyPage
 */
import { getTitleProgress } from '../../lib/title';
import PointsCallout from './PointsCallout';
import TitleChip from './TitleChip';
import TitleProgress from './TitleProgress';

interface ProfileCardProps {
  nickname: string;
  points: number;
}

export default function ProfileCard({ nickname, points }: ProfileCardProps) {
  const progress = getTitleProgress(points);

  return (
    <section aria-labelledby="my-greeting" className="rounded-lg border border-hairline bg-card p-6">
      <h2 id="my-greeting" className="break-keep text-title-md font-bold text-ink">
        {nickname} 모덕우님
      </h2>

      <div className="mt-4 flex items-center justify-between gap-3">
        <PointsCallout points={points} />
        <TitleChip title={progress.title} />
      </div>

      <div className="mt-4">
        <TitleProgress progress={progress} />
      </div>
    </section>
  );
}
