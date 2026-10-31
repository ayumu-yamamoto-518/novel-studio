# 段階0:開発基盤づくり(Claude Codeへの依頼文)

## 使い方(人がやること)

1. 空のフォルダ(例: novel-studio)を作り、VS Codeで開く
2. Claude Codeを開き、Planモード(計画だけを出させるモード)にする
3. 下の「依頼文」の部分を、そのままClaude Codeに貼る
4. 出てきた計画を読み、問題なければ承認する。実行中のコマンド許可は、内容を確認してから許可する
5. 終わったら、自分でも `npm run check` を実行して結果を確認する
6. GitHubのリポジトリ作成と push は、自分で行う(Claude Codeにトークンを渡さない)

---

## 依頼文(ここから下を貼る)

あなたはこれから、ポートフォリオ用の個人開発アプリ「novel-studio」(小説の執筆支援Webアプリ)の開発を手伝います。
今回は「段階0」として、機能を作る前の開発基盤(AIの出力を自動で検証する仕組み)だけを整えます。画面やロジックなどの機能は、まだ作りません。

### 進め方

1. まず、実行する手順の計画を出してください。私が承認するまで、ファイルの作成や変更、コマンドの実行はしないでください。
2. 承認後、下の「やること」をA→Iの順に1項目ずつ進め、項目ごとにコミットしてください。
3. バージョンや設定の書式は、記憶に頼らず、必ず公式ドキュメントで現在の手順を確認してから設定してください(Vite、Tailwind CSS、shadcn/ui、ESLint、Vitest、MSW、GitHub Actions、Claude Codeのhooksと設定)。
4. 不明点は推測で進めず、質問してください。

### 前提

- 実務(会社)のコード、画面、データ、顧客情報は一切使いません。
- 秘密情報(APIキー等)は書かない・コミットしない。
- バックエンドは持たない。APIはMSWで再現する。
- パッケージマネージャーは npm。

### やること

A. プロジェクト作成: 現在のフォルダに Vite + React + TypeScript を作成する。Nodeのバージョンを確認し、.nvmrc に記録する。

B. TypeScript: strict を有効にする(テンプレートの既存設定は維持する)。

C. 静的解析: ESLint(typescript-eslint、react-hooks)と Prettier を導入する。`any` の使用、`@ts-ignore`、`eslint-disable` を禁止するルールを入れる。package.json に次のスクリプトを用意する: lint、lint:fix、format、format:check、typecheck、test、check(= lint + typecheck + test + build)。

D. テスト: Vitest と Testing Library(react、jest-dom、user-event)を導入し、サンプルのテストを1つ作る。

E. ライブラリ: Tailwind CSS、shadcn/ui、jotai、TanStack Query、MSW を導入する。それぞれ最小限の配線のみ(動作確認用のサンプルは各1つまで)。

F. CI: GitHub Actions で、pull_request と main への push のたびに、依存関係のインストール(npm ci)と `npm run check` を実行する。

G. Claude Codeの設定:
- CLAUDE.md を、この下の「CLAUDE.mdの内容」で作成する。
- ファイル編集後に、整形とlintを自動実行する hook を設定する(.claude/settings.json)。
- 権限設定: `npm run *` と読み取り系の git コマンドは許可、.env の読み取りは拒否。

H. ドキュメント: docs/ai-log.md(テンプレート)、README.md(骨組み)、.gitignore を作る。

I. 動作確認:
1. `npm run check` が全部通ることを確認する。
2. わざとlintエラー(`any` の使用)と型エラーを1つずつ入れ、hook または `npm run check` で検出されることを確認し、元に戻す。

### やらないこと

- 画面やロジックなどの機能の実装
- 上記以外のライブラリの追加
- git push、GitHubリポジトリの作成(私が行います)

### 完了したら報告してください

- 設定した内容の一覧
- 実行したコマンドと結果
- 私の確認が必要な判断(あれば)

### CLAUDE.mdの内容

以下をそのまま CLAUDE.md にしてください。

~~~markdown
# novel-studio

## 概要
小説の執筆を支援するWebアプリ(個人開発・ポートフォリオ)。作品と章の管理、文字数と執筆時間の進捗、ステータス別タブ、期間検索、テキスト出力。
バックエンドは持たず、APIはMSWで再現する。

## 技術スタック
Vite / React / TypeScript(strict) / Tailwind CSS / shadcn/ui / jotai / TanStack Query / MSW / Vitest + Testing Library / Playwright(主要な流れのみ・段階3で導入)
設定の書式やバージョンは、記憶に頼らず公式ドキュメントで確認してから変更する。

## コマンド
- npm run dev: 開発サーバー
- npm run lint / lint:fix / format / format:check / typecheck / test / build
- npm run check: lint + typecheck + test + build。これが通るまで「完了」と言わない。

## 開発ルール
1. 実装の前にテストを書く。失敗することを確認してから実装する。
2. 変更は小さく(1機能・1PR)。大きくなりそうなら、先に分割案を出す。
3. any、@ts-ignore、eslint-disable は使わない。必要なら理由を示して確認を取る。
4. 要件にないものや、不要な抽象化は作らない(YAGNI)。早すぎる共通化もしない。
5. データ取得は TanStack Query、画面の状態は jotai。useEffect でのデータ取得は書かない。
6. ディレクトリは機能単位(src/features/<機能名>/)で分ける。
7. main に直接コミットしない。ブランチを切って、PRを出す。
8. コミットメッセージには「何を・なぜ」を書く。
9. 秘密情報(APIキー等)は書かない。.env は .gitignore に入れる。
10. 不明点は推測で埋めず、質問する。

## 完了の定義
- npm run check が通っている
- 追加・変更した振る舞いにテストがある
- 何を変えたか、どう確認したかを説明できる

## AIログ(docs/ai-log.md)
AIの出力が間違っていた場合や、人が直した場合は記録する(日付、何が起きたか、どう気づいたか、どう直したか、学び)。
実際に起きたことだけを書く。人が「記録して」と言ったときに下書きを作り、人が確認してから保存する。
~~~