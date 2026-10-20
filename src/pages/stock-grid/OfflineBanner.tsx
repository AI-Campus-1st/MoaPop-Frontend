/**
 * 오프라인 배너 (components/feedback.md 'offline-banner')
 * 화면을 불러온 뒤 실시간 연결이 끊겼을 때만, 상단바 바로 아래(인증 배너 위)에 둔다.
 * warn-soft 면 + warn-deep 테두리 1.5px + ink 글자. 처음 불러오기 실패에는 쓰지 않는다(빈 상태로 안내).
 * 사용처: StockGridPage
 */
export default function OfflineBanner() {
  return (
    <div role="status" className="mb-3 rounded-md border-[1.5px] border-warn-deep bg-warn-soft px-4 py-3 text-body-sm font-medium text-ink">
      실시간 연결이 끊겼어요
    </div>
  );
}
