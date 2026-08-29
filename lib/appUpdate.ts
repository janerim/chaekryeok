import Constants from 'expo-constants';
import { format } from 'date-fns';
import { getMeta, setMeta } from '@/db/database';

// App Store 조회용 정보
const BUNDLE_ID = 'com.ryubi.chaengnyeok';
const ASC_APP_ID = '6762242539';
// country=kr → 한국 스토어의 버전/릴리스 노트(한국어)를 가져온다.
const LOOKUP_URL = `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=kr`;

export type UpdateInfo = {
  storeVersion: string;
  currentVersion: string;
  releaseNotes: string;
  storeUrl: string;
};

/**
 * "1.0.2" vs "1.0.10" 같은 버전을 숫자 단위로 안전하게 비교한다.
 * a < b → 음수, 같으면 0, a > b → 양수.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * App Store의 최신 버전을 조회해, 설치된 버전보다 높으면 업데이트 정보를 반환한다.
 * 네트워크 실패·최신 버전·조회 불가 시에는 null을 반환하고 절대 앱을 막지 않는다.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const currentVersion = Constants.expoConfig?.version ?? '';
  if (!currentVersion) return null;
  try {
    const res = await fetch(LOOKUP_URL);
    if (!res.ok) return null;
    const json = await res.json();
    const info = json?.results?.[0];
    const storeVersion: string | undefined = info?.version;
    if (!storeVersion) return null;
    // 설치 버전이 스토어와 같거나 더 높으면(내부 테스트 등) 팝업을 띄우지 않는다.
    if (compareVersions(currentVersion, storeVersion) >= 0) return null;
    return {
      storeVersion,
      currentVersion,
      releaseNotes: (info?.releaseNotes ?? '').trim(),
      storeUrl:
        info?.trackViewUrl ?? `https://apps.apple.com/app/id${ASC_APP_ID}`,
    };
  } catch {
    return null;
  }
}

// 마지막으로 팝업을 띄운 기록. "<스토어 버전>|<YYYY-MM-DD>" 형태로 저장한다.
const LAST_PROMPT_KEY = 'update_prompt_last';

/**
 * 같은 버전 안내는 하루에 한 번만 띄운다.
 * 단, 그 사이 더 새로운 버전이 올라왔다면 날짜와 무관하게 바로 알린다.
 * 저장소 접근이 실패하면 안내를 막지 않는 쪽(true)으로 둔다.
 */
export async function shouldPrompt(storeVersion: string): Promise<boolean> {
  try {
    const raw = await getMeta(LAST_PROMPT_KEY);
    if (!raw) return true;
    const [shownVersion, shownDate] = raw.split('|');
    if (shownVersion !== storeVersion) return true;
    return shownDate !== format(new Date(), 'yyyy-MM-dd');
  } catch {
    return true;
  }
}

export async function markPrompted(storeVersion: string): Promise<void> {
  try {
    await setMeta(
      LAST_PROMPT_KEY,
      `${storeVersion}|${format(new Date(), 'yyyy-MM-dd')}`
    );
  } catch {}
}
