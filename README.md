# novel-studio

小説の執筆を支援するWebアプリです(個人開発・ポートフォリオ)。作品と章を管理し、章の本文を書いて、文字数を見ながら保存できます。バックエンドは持たず、API は MSW で再現しています。

- 公開URL: https://novel-studio-ivory.vercel.app
- データはブラウザの localStorage に保存されます(サーバーには送られません)。

## 何を作ったか

### 実装済み

- 作品の一覧・新規作成・削除(作品を削除すると、その作品の章も消えます)
- 「執筆中」「完了」のタブと、作品のステータスの変更
- 作品を開いての、章の一覧・追加・削除
- 章を開いての、本文の編集・保存と、文字数の表示(空白と改行を除く)。未保存の表示と、保存に失敗したときに下書きを残す動作を含みます

### 未実装・今後の予定

- 執筆時間の進捗、期間検索、テキスト出力(当初の構想にあり、まだ作っていません)
- 任意機能: 削除の確認ダイアログ、作品のタイトル変更、章の名前変更。現状、削除は確認なしで即時に行われます

## どう作ったか

実装の大部分は Claude Code に任せ、方針の判断(選択肢の決定)、コマンドの許可、ブラウザでの確認、PRのレビューとマージは人が行いました。機能より先に、AIの出力を自動で検証する仕組み(ハーネス)を整え、その上で、毎回同じ手順(ループ)で機能を足しています。

## 品質担保の仕組み

### ハーネス

AIが書いたものを、人の目だけに頼らず検証するための土台です。

- [CLAUDE.md](CLAUDE.md): 開発ルール(テスト先行、`any` / `@ts-ignore` / `eslint-disable` の禁止、YAGNI、main に直接コミットしない、完了の定義など)
- `npm run check`: lint・型検査・テスト・ビルドをまとめて実行。通るまで「完了」としない
- フック([.claude/hooks/format-lint.sh](.claude/hooks/format-lint.sh)): AI がファイルを編集・作成(Edit / Write)するたびに、ts・tsx・js・jsx・json・css・md・yml・html を Prettier で整形し、ts・tsx・js・jsx は ESLint も実行する。違反があれば AI に差し戻す
- 権限([.claude/settings.json](.claude/settings.json)): 確認なしで実行してよいコマンドを、`npm run` のスクリプトと、読み取り系の git コマンド(status・diff・log・show、branch は現在のブランチ名と一覧のみ)に絞る。AI の `.env` の読み取り、git の `--output` 指定(全 git コマンド)、`git diff --no-index` は拒否する(`grep -r` や、スクリプトがファイルを直接開く場合は止められない。限界は ai-log に記録)
- CI([.github/workflows/ci.yml](.github/workflows/ci.yml)): PR ごとと main への push で `npm run check` を実行する
- Superpowers プラグイン(6.4.2)は有効化したが、開発の手順は CLAUDE.md と Plan モードで運用した

### ループ

CLAUDE.md の規則ではなく、運用の手順です。1つの PR を、次の順で進めています。

1. 計画: Plan モードで、読み取り専用でコードを調べ、計画を出させる。人が確認・承認してから着手する
2. テスト先行: 先にテストを書き、失敗(赤)を確かめる
3. 実装: 計画どおりに、1コミット=1つの振る舞いで進める
4. `npm run check`(ミューテーションの前は typecheck、最後にもう一度 check)
5. ミューテーション: 実装をわざと壊し、テストが赤になることを確かめる
6. 別のAIが、読み取り専用でブランチ全体をレビューする
7. 人が画面で確認する
8. PR と CI
9. 人がレビューしてマージする

### AIの間違いの記録

運用の記録は docs/ai-log.md と各 PR の説明に残っています。AIの出力が間違っていた場合や、人が直した場合は、実際に起きたことだけを [docs/ai-log.md](docs/ai-log.md) に記録しています(21件)。例:

- **二重送信のテストが、守りたいガードを外しても通る偽の緑だった**: 緑を信用せず実装を壊して確かめたことで気づき、送信回数を直接数えるテストに直しました。ミューテーションが役に立った例です。
- **基本設定の ESLint では、`eslint-disable` コメントで `any` を隠せた**: 禁止ルールを入れる前に、実際に抜け道を試して見つけ、`noInlineConfig` で塞ぎました。ハーネスの穴を、先に試して塞いだ例です。
- **git の許可ルールが、任意ファイルの書き込み・読み取りを確認なしで通した**: 「読み取り専用」と名前で判断して入れた許可を、別コンテキストのレビュアーが、実際にコマンドを実行して、間違いと確かめました。確認付きにしたあと、最終的に拒否に直しました。

## 計画の PR と GitHub の PR

段階1の PR は、計画上の番号(PR1〜PR7)で呼ぶことがあります(ai-log・PR のタイトル・コミットメッセージで、部分的に使っています)。GitHub の PR 番号とは次のように対応します。

| GitHub | 計画上の番号 | ブランチ                   | 内容                                                     |
| ------ | ------------ | -------------------------- | -------------------------------------------------------- |
| #1     | -            | `phase0/foundation`        | 段階0: 開発基盤づくり(strict TS・lint・テスト・CI・hook) |
| #2     | -            | `phase0/wrapup`            | 段階0の仕上げ(README、ai-log、権限設定の修正など)        |
| #3     | PR1          | `phase1/domain-types`      | 作品と章の型を追加し、サンプルを削除                     |
| #4     | PR2          | `phase1/works-list-create` | 作品の一覧表示と新規作成                                 |
| #5     | PR3          | `phase1/work-delete`       | 作品の削除                                               |
| #6     | PR4          | `phase1/work-status-tabs`  | 作品のステータス変更と、「執筆中 / 完了」のタブ          |
| #7     | PR5          | `phase1/chapters-api`      | 章の API と、作品の削除時に章も消す処理                  |
| #8     | PR6          | `phase1/chapters-ui`       | 作品を開いての、章の一覧・追加・削除                     |
| #9     | PR7          | `phase1/chapter-editor`    | 章の本文の編集・保存と文字数の表示                       |

#10 以降は段階3(提出に向けた仕上げ)です。

## 技術スタック

Vite / React / TypeScript(strict) / Tailwind CSS / shadcn/ui / jotai / TanStack Query / MSW / Vitest + Testing Library / ESLint / Prettier / GitHub Actions

## セットアップ

```bash
nvm use        # .nvmrc の Node を使う
npm ci
npm run dev
```

## コマンド

| コマンド                          | 内容                                        |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | 開発サーバー                                |
| `npm run lint` / `lint:fix`       | ESLint(警告も失敗扱い)                      |
| `npm run format` / `format:check` | Prettier                                    |
| `npm run typecheck`               | 型検査                                      |
| `npm run test`                    | Vitest                                      |
| `npm run build`                   | 本番ビルド                                  |
| `npm run check`                   | lint + typecheck + test + build(PRごとにCI) |

## ディレクトリ構成

```
src/
  components/ui/    shadcn/ui の部品
  features/         機能単位のコード(src/features/<機能名>/)
    works/          作品(型・API ハンドラ・一覧・作成フォーム・削除・ステータスのタブ・作品の画面)
    chapters/       章(型・API ハンドラ・一覧・作成フォーム・削除)
    editor/         本文エディタ(本文の編集・保存・文字数)
  start-app.tsx     起動処理(MSW の起動に失敗したときのエラー表示を含む)
  lib/              共通ユーティリティ(QueryClient、タイトルの検証、fetch の共通部分など)
  mocks/            MSW のハンドラ(ブラウザ用・テスト用)と、保存先の db(localStorage。作品と章)
  test/             テストの共通設定
docs/ai-log.md      AIログ
```

## 既知の課題

- 画面の切り替え(作品の一覧・作品の画面・本文エディタ)を jotai の状態で行っているため、ブラウザの戻るボタンと URL 共有は効きません。作品の画面や本文エディタでリロードすると、作品の一覧に戻ります。react-router の導入は、変更が大きいため見送っています。
- ビルドで `shadcn/tailwind.css` を読むため、`shadcn` が `devDependencies` にあっても、`devDependencies` を入れる環境でビルドする必要があります(`NODE_ENV=production` や `npm ci --omit=dev` ではビルドに失敗します)。Vercel は既定で入れます。
- 本文は自動保存されません。「保存」を押す前にリロードすると、未保存の本文は失われます(本文エディタから「戻る」ときは確認が出ますが、リロードやタブを閉じるときは出ません)。
- 日本語入力(IME)で変換中の未確定の文字も、文字数に数えます。
- 同じ章を別のタブで開いている場合、最後に保存したほうが勝ちます(競合は検出しません)。編集中の章は、タブに戻っても取り直さないので、別のタブでの保存は画面に反映されません。
- E2E テスト(Playwright)は導入していません。画面の振る舞いは、Vitest + Testing Library と MSW のテストで確かめています。
- `npm audit --omit=dev` は 0 件です。ただし、部品を追加するためのビルド用の `shadcn` CLI は `devDependencies` に残っており、開発依存を含む `npm audit` では指摘が残ります(16 件。低 2・中 14)。TypeScript のコードからは import しておらず(CSS の `@import 'shadcn/tailwind.css'` だけ読みます)、ビルドした JavaScript にも含まれません。
