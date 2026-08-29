import { format, isValid, parseISO } from 'date-fns';

// SQLite 의 datetime('now') 는 "2026-08-29 05:32:00" (UTC, T/Z 없음) 형태라
// 그대로 파싱하면 로컬 시각으로 오해된다. ISO 로 맞춰준다.
function normalize(raw: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw;
}

// 저장된 시각을 "2026-08-29 14:32" 형태의 기기 시간대로 바꾼다.
export function formatWrittenAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = parseISO(normalize(iso));
  if (!isValid(d)) return null;
  return format(d, 'yyyy-MM-dd HH:mm');
}
