/**
 * 공식 게시물 이미지 주소 API (Edge Function get-official-image-urls, API_spec IMG-1)
 * 화면 여러 곳에서 같은 순간에 요청한 이미지를 한 번의 호출로 묶고(SKU·팝업 각 50개씩), 받은 주소를 기억한다.
 * 기억: 이 탭이 열려 있는 동안 메모리에만 둔다(브라우저 저장소·서버에 저장하지 않음, INGEST_PIPELINE 6-5).
 *       공식 이미지 주소는 약 4일 유효하므로 탭을 새로 열면 다시 조회한다.
 * 실패: 함수 호출이 실패하면 null 로 돌려주고 기억하지 않는다(다음에 화면이 다시 열릴 때 재시도).
 * 사용처: src/lib/useOfficialImage.ts (화면은 이 Hook 을 쓴다)
 */
import { supabase } from '../lib/supabase';

export type ImageKind = 'popup' | 'sku';

/** 함수가 한 번에 받는 id 개수 상한(SKU·팝업 각각, BUSINESS_LOGICS U-11) */
const MAX_IDS_PER_CALL = 50;

/** 받은 주소(못 찾았으면 null). 키: "popup:id" / "sku:id" */
const resolved = new Map<string, string | null>();
/** 조회 중인 요청. 같은 이미지를 여러 화면이 동시에 요청해도 한 번만 부른다 */
const inflight = new Map<string, Promise<string | null>>();
/** 이번 차례에 모인 요청과, 결과를 넘겨줄 함수 */
let queue: { kind: ImageKind; id: string; resolve: (url: string | null) => void }[] = [];
let flushScheduled = false;

function keyOf(kind: ImageKind, id: string): string {
  return `${kind}:${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 응답의 { id: 주소 | null } 묶음에서 한 id 의 주소를 꺼낸다 */
function urlFrom(group: unknown, id: string): string | null {
  if (!isRecord(group)) return null;
  const value = group[id];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** 이미 받은 주소가 있으면 바로 돌려준다(없으면 undefined). 화면 첫 그림을 깜빡임 없이 그리는 데 쓴다 */
export function peekOfficialImageUrl(kind: ImageKind, id: string): string | null | undefined {
  return resolved.get(keyOf(kind, id));
}

/** 모인 요청을 50개씩 나눠 함수를 부르고, 결과를 각 요청에 넘겨준다 */
async function flush(): Promise<void> {
  flushScheduled = false;
  const batch = queue;
  queue = [];

  const skus = batch.filter((item) => item.kind === 'sku');
  const popups = batch.filter((item) => item.kind === 'popup');
  const rounds = Math.max(Math.ceil(skus.length / MAX_IDS_PER_CALL), Math.ceil(popups.length / MAX_IDS_PER_CALL));

  for (let round = 0; round < rounds; round += 1) {
    const skuPart = skus.slice(round * MAX_IDS_PER_CALL, (round + 1) * MAX_IDS_PER_CALL);
    const popupPart = popups.slice(round * MAX_IDS_PER_CALL, (round + 1) * MAX_IDS_PER_CALL);
    let body: unknown = null;
    try {
      const { data, error } = await supabase.functions.invoke('get-official-image-urls', {
        body: { sku_ids: skuPart.map((item) => item.id), popup_ids: popupPart.map((item) => item.id) },
      });
      if (!error) body = data;
    } catch {
      body = null;
    }

    const result = isRecord(body) ? body : null;
    for (const item of [...skuPart, ...popupPart]) {
      const key = keyOf(item.kind, item.id);
      const url = result ? urlFrom(result[item.kind === 'sku' ? 'skus' : 'popups'], item.id) : null;
      // 성공한 응답만 기억한다(실패는 다음에 다시 시도)
      if (result) resolved.set(key, url);
      inflight.delete(key);
      item.resolve(url);
    }
  }
}

/**
 * 공식 게시물 이미지 주소를 돌려준다. 못 찾으면 null(화면은 대체 아이콘).
 * 같은 순간(같은 렌더 차례)에 들어온 요청은 모아서 한 번에 부른다.
 */
export function getOfficialImageUrl(kind: ImageKind, id: string): Promise<string | null> {
  const key = keyOf(kind, id);
  const known = resolved.get(key);
  if (known !== undefined) return Promise.resolve(known);
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    queue.push({ kind, id, resolve });
  });
  inflight.set(key, promise);
  if (!flushScheduled) {
    flushScheduled = true;
    // 지금 차례의 다른 요청이 다 모일 때까지 한 박자 기다렸다가 묶어서 부른다
    setTimeout(() => void flush(), 0);
  }
  return promise;
}
