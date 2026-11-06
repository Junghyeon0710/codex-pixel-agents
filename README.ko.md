# Codex Pixel Agents

[English](README.md) · 한국어

**Codex 작업을 픽셀 사무실에서 보여주는 로컬 뷰어입니다.**

[Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents)의 화면을 재사용하고, Codex Desktop·CLI의 로컬 세션 기록을 읽는 연동을 추가했습니다.

![사무실 예제 화면](docs/codex/preview.png)
_화면은 개인정보가 없는 예제 세션입니다. 실제 Codex 테스트는 별도로 수행했습니다._

## 사용 방법

Node.js 22.12 이상과 npm이 필요합니다. Node 24에서 검증했습니다.

```sh
git clone https://github.com/Junghyeon0710/codex-pixel-agents.git
cd codex-pixel-agents
npm ci --ignore-scripts
npm run build
npm start
```

출력되는 **Local office** 주소를 브라우저에서 열고, Codex에서 평소처럼 작업하면 됩니다. 터미널은 켜두고 종료할 때 `Ctrl+C`를 누르세요. 이 포크는 npm·VS Code 마켓플레이스에 별도로 배포하지 않았습니다.

특정 프로젝트만 표시하려면:

```sh
npm start -- --workspace "D:/Unreal Projects/MyGame"
```

세션 작업 폴더와 정확히 일치해야 합니다. 별도 worktree라면 해당 경로를 지정하거나 필터를 빼세요.

```sh
npm start -- --port 4880 --recent-minutes 120
npm start -- --sessions-dir "C:/path/to/codex/sessions"
```

기본 입력은 `CODEX_HOME/sessions`, 환경변수가 없으면 `~/.codex/sessions`입니다. 최근 60분 이내에 갱신된 세션이 기본 표시 대상입니다.

## 무엇을 보여주나요?

- 실제 기록이 있는 세션과 하위 에이전트를 각각 캐릭터로 표시합니다.
- 모델, 역할, 프로젝트 폴더 이름, 실행 중인 도구 이름을 보여줍니다.
- 부모/자식 관계는 실제 메타데이터가 있을 때만 연결합니다.
- 작업 시작, 도구 실행·종료, 작업 완료, 브라우저 재접속을 반영합니다.

**에이전트를 배치하는 관리자가 아니라, 이미 실행 중인 Codex를 관찰하는 화면입니다.** “문 만들어줘”라고 했을 때 몇 명을 배치할지, 어떤 모델을 쓸지는 Codex와 스튜디오 프로젝트 설정이 결정합니다. 뷰어는 그 결과로 생긴 로컬 세션을 표시합니다. Codex 앱에 설치되는 사이드바 확장은 아닙니다.

## 상태와 한계

| 표시          | 의미                                                 |
| ------------- | ---------------------------------------------------- |
| `active`      | 작업 시작 또는 도구 호출이 기록됨                    |
| `idle`        | 작업 종료가 기록됨. 결과의 성공까지 보장하지 않음    |
| `interrupted` | 작업 중단 기록이 있음                                |
| `stale`       | 5분 넘게 기록 갱신이 없음. 프로세스 생존 여부는 모름 |
| `unknown`     | 해석 가능한 작업 상태 기록이 없음                    |

최근 파일 후보 200개에서 최대 24개 세션을 표시합니다. 내부 승인용 세션은 제외합니다. 64 MiB 초과 파일은 초기 재생에서 제외하고 UI에 알립니다. 2 MiB 초과 레코드는 건너뜁니다. 원격 클라우드 작업 등 로컬 JSONL 기록이 없으면 표시할 수 없습니다. Codex 내부 형식 변경으로 연동 수정이 필요할 수 있습니다.

첫 버전은 원본의 고정 사무실 배치를 사용합니다. 배치 편집·터미널·에이전트 실행·훅 설치는 비활성화되어 있습니다. 확대·축소, 이동, 캐릭터 선택은 가능합니다. Unreal MCP 자체를 연결하는 프로그램도 아닙니다.

## 개인정보와 설정

로그를 로컬에서 읽되 프롬프트·답변·추론·도구 인자와 결과는 브라우저에 보내지 않습니다. 세션 ID, 역할·모델·도구 이름과 프로젝트 폴더의 마지막 이름은 전달하므로, 개인 작업 화면을 공유할 때 확인하세요.

서버는 `127.0.0.1`에서만 열리며 매 실행마다 바뀌는 토큰과 동일 Origin/Host를 검사합니다. 출력된 접속 주소에는 토큰이 있으므로 공개하지 마세요. Codex 설정·승인 정책·훅은 변경하지 않으며 명령 실행·파일 수정 API도 없습니다.

## 검증과 라이선스

새로운 실제 Codex CLI 세션을 읽기 전용으로 실행해 **세션 발견 → 도구 실행 → 도구 종료 → idle**을 확인했습니다. 파서·서버, 원본 프런트엔드, Chromium 화면 테스트도 별도로 수행했습니다. 범위와 결과는 [검증 기록](docs/codex/VALIDATION.md)에 있습니다.

원본 MIT 저작권과 라이선스를 보존했습니다. 캐릭터는 JIK-A-4의 MetroCity(CC0), 폰트는 FS Pixel Sans Unicode(OFL 1.1)입니다. [라이선스](LICENSE)와 [출처 고지](THIRD_PARTY.md)를 참고하세요. OpenAI 또는 원본 Pixel Agents 팀의 공식 제품은 아닙니다.
