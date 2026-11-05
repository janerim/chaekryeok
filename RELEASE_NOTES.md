# 릴리스 노트

App Store Connect의 "이번 버전의 새로운 기능"에 넣는 문구를 모아둔다.

## 1.1.1 (준비 중, 아직 올리지 않음)

**가계력을 App Store에 출시할 때 같이 올린다.** 새 기능 없이 모양만 가계력과 맞춘 버전이라 따로 서두르지 않는다.

- 코드는 2026-11-05 에 들어갔다. 타입 체크와 iOS 번들 내보내기만 확인했고 **기기 화면은 아직 못 봤다.**
- 올릴 때 `app.json`·`package.json`의 `version`을 1.1.1 로 올린다 (지금은 1.1.0 그대로).
- 바뀐 것
  - 탭바, 월 이동 화살표, 책 추가 버튼을 이모지·문자에서 아이콘으로 (`@expo/vector-icons` 의 Ionicons)
  - 보조 글자색 `#888888` → `#6B7280`
- 탭바·월 이동 헤더는 가계력(`../gagyeryeok`)과 한 벌이다. 한쪽 모양을 바꾸면 다른 쪽도 같이 바꾼다.

```
• 탭과 버튼의 아이콘이 더 깔끔해졌어요.
• 회색 글자가 조금 진해져 읽기 편해졌어요.
```

## 1.1.0

```
• 올해 읽을 권수를 정하는 독서 목표가 생겼어요. 통계 탭에서 정하고 고칠 수 있어요.
• 달력 탭과 통계 탭에서 목표까지 얼마나 왔는지 볼 수 있어요.
• 다 읽은 날을 기준으로 세고, 중단한 책은 넣지 않아요.
• 백업에 목표도 함께 담겨요. 예전 백업도 그대로 복원할 수 있어요.
• 아이콘과 시작 화면이 새로워졌어요.
```

## 1.0.3

### 한국어

```
• 메모/독후감을 여러 번 나눠 남길 수 있어요. 읽는 중간중간 적은 기록이 작성 시각과 함께 시간순으로 쌓입니다.
• 지금까지 쓰신 메모는 그대로 첫 번째 기록으로 옮겨져요.
• 기록은 언제든 눌러서 고치거나 지울 수 있어요.
• 한줄 감상과 읽고 싶은 책 메모에도 작성 시각이 표시돼요.
• 백업에 기록이 함께 담겨, 복원해도 작성 시각까지 그대로 남아요.
• 책 상세 화면의 '편집' 버튼이 더 잘 눌려요.
• 새 버전 안내가 하루에 한 번만 표시돼요.
```

### English

```
• You can now jot down notes as you read. Each entry is saved with the time you wrote it and stacks up in order.
• Notes you've already written are carried over as your first entry.
• Tap any entry to edit or delete it.
• One-line reviews and reading list notes now show when you wrote them.
• Backups include your notes, so the timestamps survive a restore.
• The Edit button on the book detail screen is easier to tap.
• New version notices now appear at most once a day.
```

## 1.0.2

```
• 표지 이미지가 앱 업데이트·재설치 후에도 그대로 유지돼요.
• 백업에 표지 이미지가 함께 담겨, 새 기기나 재설치 후에도 완전히 복원됩니다.
• 파일 앱에 저장한 백업을 바로 선택해 불러올 수 있어요.
• 백업·복원 진행 상황을 퍼센트로 보여드려요.
• 도서 장르를 19개로 늘렸어요 (시·심리·여행·요리 등).
• 이미지 검색 화면 스크롤이 부드러워졌어요.
• 새 버전이 나오면 앱에서 안내해 드려요.
```
