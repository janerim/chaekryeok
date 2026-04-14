export const GENRES = [
  '소설',
  '에세이',
  '자기계발',
  '과학',
  '역사',
  '경제',
  '인문',
  '만화',
  '기타',
] as const;

export type Genre = (typeof GENRES)[number];
