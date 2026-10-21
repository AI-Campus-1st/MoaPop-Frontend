/**
 * 화면에 보여 줄 이미지 주소를 정하는 Hook (API_spec IMG-1의 우선순위)
 * 1) 우리가 올린 이미지(image_url)가 있으면 그것 2) 없으면 공식 게시물 이미지(Edge Function 조회)
 * 3) 둘 다 없으면 '' → ImageFallback 이 대체 아이콘을 보여 준다.
 * 공식 이미지는 늦게 올 수 있어서(첫 조회 수 초), 오기 전에는 '' 를 돌려 대체 아이콘을 먼저 보여 준다.
 * 사용처: components/PopupListItem (찜 목록 썸네일), pages/popup-detail (대표 이미지·굿즈 미리보기),
 *         pages/stock-grid SkuCard (재고 연결 단계에서 적용)
 */
import { useEffect, useState } from 'react';
import { getOfficialImageUrl, peekOfficialImageUrl, type ImageKind } from '../api/images';

/**
 * @param kind 팝업 대표 이미지면 'popup', 굿즈 이미지면 'sku'
 * @param id 팝업 또는 SKU id. 아직 모르면(로딩 중) null
 * @param directUrl 우리가 올린 이미지 주소(image_url). 있으면 공식 이미지를 조회하지 않는다
 */
export function useOfficialImage(kind: ImageKind, id: string | null, directUrl: string): string {
  // 이미 받아 둔 주소가 있으면 첫 그림부터 바로 쓴다(깜빡임 방지)
  const initial = directUrl || (id ? peekOfficialImageUrl(kind, id) ?? '' : '') || '';
  const [src, setSrc] = useState(initial);

  useEffect(() => {
    if (directUrl) {
      setSrc(directUrl);
      return;
    }
    if (!id) {
      setSrc('');
      return;
    }

    let cancelled = false;
    setSrc(peekOfficialImageUrl(kind, id) ?? '');
    getOfficialImageUrl(kind, id).then((url) => {
      // 응답 전에 화면이 바뀌었으면(다른 팝업으로 이동 등) 덮어쓰지 않는다
      if (!cancelled) setSrc(url ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [kind, id, directUrl]);

  return src;
}
