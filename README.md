# 책력 (Chaengnyeok)

읽은 책을 달력에 기록하는 개인용 독서 기록 앱입니다.
완독한 날짜를 달력에 남기고, 읽고 싶은 책을 모아두고, 쌓인 기록을 통계로 돌아볼 수 있습니다.

- **플랫폼**: iOS (App Store 배포), Android, Web (Expo)
- **번들 ID / 패키지**: `com.ryubi.chaengnyeok`
- **데이터**: 전부 기기 안에만 저장됩니다. 서버도 계정도 없습니다.

## 주요 기능

| 탭 | 설명 |
| --- | --- |
| 📅 캘린더 | 월 단위 달력. 시작일~완독일 구간을 막대로 표시하고, 완독·읽는 중·중단을 구분해서 보여줍니다. (주 시작: 월요일) |
| 📚 전체 기록 | 등록한 모든 책을 월별로 묶어서 보여줍니다. 제목·저자·출판사 검색, 전체/읽는 중/완독/중단 필터 |
| 🔖 읽고 싶은 | 위시리스트. 읽기 시작하면 기록으로 옮겨집니다(`from_wishlist`로 출처를 유지). |
| 📊 통계 | 총 기록/완독/읽는 중 권수, 평균 독서 기간, 평균 평점, 장르 분포 도넛 차트 등 |

그 밖에

- **책 등록/수정** — 제목·저자·출판사·장르·평점(★)·한줄평·메모·소장 여부·재독 횟수
- **표지 이미지** — 갤러리에서 고르거나, 앱 안의 웹뷰(네이버 이미지 검색)에서 이미지를 눌러 바로 저장
- **중단 처리** — 읽다 만 책은 중단일과 함께 따로 표시
- **백업 / 복원** — 표지 이미지까지 base64로 담은 JSON 한 파일. 공유 시트·클립보드·파일 앱에서 불러오기 지원, 복원은 *덮어쓰기 / 이어붙이기* 선택
- **업데이트 안내** — App Store의 최신 버전을 조회해 새 버전이 있으면 릴리스 노트와 함께 알려줍니다

## 기술 스택

- [Expo](https://expo.dev) SDK 54 (New Architecture 활성화) + React Native 0.81 + React 19
- [expo-router](https://docs.expo.dev/router/introduction/) — 파일 기반 라우팅
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) — 로컬 DB (`reading_calendar.db`, WAL 모드)
- [zustand](https://zustand.docs.pmnd.rs/) — 상태 관리
- [date-fns](https://date-fns.org/) — 날짜 계산
- `react-native-svg` (통계 차트), `react-native-webview` (표지 이미지 검색)
- TypeScript (strict), 경로 별칭 `@/*` → 프로젝트 루트

## 시작하기

```bash
npm install          # .npmrc에 legacy-peer-deps=true 설정되어 있음
npm start            # Expo 개발 서버
```

플랫폼별 실행:

```bash
npm run ios          # expo run:ios      (네이티브 빌드 — macOS + Xcode 필요)
npm run android      # expo run:android  (Android Studio / SDK 필요)
npm run web          # expo start --web
```

> `ios/`, `android/` 폴더는 커밋하지 않습니다. `expo run:*` 실행 시 자동 생성되는 산출물입니다.

### 빌드 / 배포 (EAS)

```bash
eas build --profile development --platform ios   # 개발 클라이언트
eas build --profile preview     --platform ios   # 내부 배포
eas build --profile production  --platform ios   # 스토어 제출용 (빌드 번호 자동 증가)
eas submit --profile production --platform ios
```

버전은 `app.json`/`package.json`의 `version`을 올려서 관리하고, 빌드 번호는 EAS가 원격에서 관리합니다(`appVersionSource: "remote"`).

## 프로젝트 구조

```
app/                      expo-router 라우트
  _layout.tsx             루트 레이아웃 (스토어 초기화, 업데이트 확인)
  (tabs)/                 캘린더 · 전체 기록 · 읽고 싶은 · 통계
  book-form.tsx           책 등록/수정
  book-detail.tsx         책 상세
  wishlist-form.tsx       위시리스트 등록/수정
  wishlist-detail.tsx     위시리스트 상세
  image-search.tsx        웹뷰 기반 표지 이미지 검색
  backup.tsx              백업 / 복원 / 전체 삭제

components/
  book/                   GenreTag, StarRating
  calendar/               CalendarGrid, CalendarCell, MonthNavigator
  common/                 DatePickerButton, UpdatePrompt

constants/                colors.ts, genres.ts, 샘플 데이터
db/database.ts            SQLite 스키마 + books / wishlist CRUD
hooks/                    useCalendar(달력 매트릭스), useImagePicker
lib/                      backup(백업 포맷), covers(표지 파일 경로), appUpdate
store/                    bookStore, wishlistStore (zustand)
```

## 데이터 모델

`books`, `wishlist` 두 테이블이 전부입니다.

- **books** — `title`(필수), `author`, `publisher`, `genre`, `cover_local_path`, `start_date`, `finish_date`, `is_owned`, `is_stopped`, `stopped_date`, `from_wishlist`, `wishlist_added_date`, `rating`, `short_review`, `memo`, `read_count`, `created_at`, `updated_at`
- **wishlist** — `title`(필수), `author`, `publisher`, `genre`, `memo`, `cover_local_path`, `created_at`

날짜는 모두 `yyyy-MM-dd` 문자열입니다. 스키마 변경은 `getDB()` 안에서 `ALTER TABLE ... ADD COLUMN`을 try/catch로 감싸 처리하므로, 기존 사용자의 DB도 그대로 열립니다. **컬럼을 추가할 때는 이 패턴을 따라주세요.**

### 표지 이미지 경로 규칙

표지는 `<documentDirectory>/covers/` 에 저장하고, **DB에는 파일명만** 넣습니다.
iOS는 앱을 재설치·업데이트하면 문서 디렉토리의 컨테이너 UUID가 바뀌어서 절대경로가 깨지기 때문입니다.
저장할 땐 `toCoverFilename()`, 화면에 쓸 땐 `resolveCoverUri()`를 거치세요 ([lib/covers.ts](lib/covers.ts)).

### 백업 포맷

`chaengnyeok_backup_<날짜>_<시각>.json`

```jsonc
{
  "version": 3,
  "app": "chaengnyeok",
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "books":    [ { /* books 행 + cover_b64 */ } ],
  "wishlist": [ { /* wishlist 행 + cover_b64 */ } ]
}
```

표지 이미지는 `cover_b64`(base64)로 함께 들어가서 파일 하나로 기기 이전이 됩니다.
복원은 v1·v2·v3를 모두 읽을 수 있고, `app` 필드가 `chaengnyeok`이 아니면 거부합니다 ([lib/backup.ts](lib/backup.ts)).

## 장르

교보문고 대분류를 참고한 19개 고정 목록입니다 ([constants/genres.ts](constants/genres.ts)).
통계 화면의 도넛 차트 팔레트도 19색으로 맞춰져 있으니, **장르를 추가하면 `GENRE_PALETTE`도 같이 늘려주세요.**
기존 데이터와의 호환을 위해 예전 9개 라벨(소설·에세이·자기계발·과학·역사·경제·인문·만화·기타)은 이름 그대로 유지합니다.
