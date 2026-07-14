import Constants from 'expo-constants';

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
