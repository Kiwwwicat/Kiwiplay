# Kiwiplay 작업 로그

## 2026-04-30

- **요청**: 깃허브 웹페이지로 작동하는 '경쟁 게임' 페이지. 1~10명 플레이어 등록(이미지 선택), 미등록 시 이름이 적힌 임의 이미지 자동 생성. '수영 게임'은 45도 기울여 위아래 움직이는 애니메이션, 랜덤 속도 변화, 상어 등장/쥐나기 이벤트. '달리기 게임', '우주 날기 게임' 등 바리에이션 포함.
  - 상태: ✅ 완료
  - 결과: 정적 GitHub Pages 사이트 v1 구축. 로비(게임 카드 3종 + 1~10명 플레이어 폼) → 게임(레인 트랙, requestAnimationFrame 60fps 루프, 게임별 transform/이벤트) → 결과(랭킹/타임). 수영=−45° 틸트+사인 보빙+상어/쥐/해파리, 달리기=수직 바운스+바나나/에너지/허들, 우주=드리프트 회전+블랙홀/운석/워프. 이미지 미등록 시 이름 해시 기반 컬러 그라디언트 SVG 아바타 자동 생성. 파일 업로드는 FileReader→dataURL.
  - 수정 파일: `index.html`, `style.css`, `script.js`, `README.md`
  - 다음: 사용자 피드백에 따라 게임 추가(자전거/스키 등), 사운드 효과, 모바일 터치 최적화

- **요청**: github 페이지까지 만들어줘 + '술 마시기 게임'도 추가
  - 상태: ✅ 완료
  - 결과:
    - 술 마시기 게임 추가: 비틀거리는 스태거 모션(±14° 회전 + 작은 vert bob), 다크 바 테마(주황+핑크 네온), 이벤트 5종 — 🍻 원샷(부스트), 🤢 토함(정지+소량 후진), 🥂 건배(전원 동시 부스트, group 플래그 신규), 😵 필름끊김(2.6초 정지), 🍤 안주(부스트). maybeFireEvents에 group 분기 추가.
    - GitHub Pages 배포: `gh repo create Kiwwwicat/Kiwiplay --public --push`로 리포 생성·푸시. `gh api pages -f source[branch]=main`으로 Pages 활성화. 빌드 중 → URL: https://kiwwwicat.github.io/Kiwiplay/
  - 수정 파일: `index.html`, `style.css`, `script.js`, `README.md`, `.gitignore`(신규)
