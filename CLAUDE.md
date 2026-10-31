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
