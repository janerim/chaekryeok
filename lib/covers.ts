import * as FileSystem from 'expo-file-system/legacy';

// 표지 이미지를 저장하는 폴더 (앱 문서 디렉토리 하위)
export const COVERS_DIR = FileSystem.documentDirectory + 'covers/';

export async function ensureCoversDir() {
  const info = await FileSystem.getInfoAsync(COVERS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true });
  }
}

// 원격 URL(http/https)이나 data URI는 파일이 아니라 그대로 사용해야 한다.
export function isRemoteCover(value: string): boolean {
  return /^(https?:|data:)/.test(value);
}

/**
 * DB에 저장할 값으로 정규화한다.
 * - 원격 URL/data URI: 그대로 유지
 * - 로컬 파일(절대경로든 파일명이든): "파일명"만 남긴다.
 *
 * iOS는 앱을 재설치/업데이트하면 문서 디렉토리의 컨테이너 UUID가 바뀌므로,
 * 절대경로를 그대로 저장하면 경로가 깨진다. 그래서 파일명만 저장한다.
 */
export function toCoverFilename(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  if (isRemoteCover(value)) return value;
  return value.split('/').pop() || value;
}

/**
 * DB에 저장된 표지 값을 "현재 기기"의 실제 표시용 URI로 변환한다.
 * 파일명만 저장돼 있어도, 예전 절대경로가 저장돼 있어도 항상 현재 경로로 재구성한다.
 */
export function resolveCoverUri(
  stored: string | null | undefined
): string | null {
  if (!stored) return null;
  if (isRemoteCover(stored)) return stored;
  const filename = stored.split('/').pop() || stored;
  return COVERS_DIR + filename;
}
