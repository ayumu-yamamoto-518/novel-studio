# novel-studio

小説の執筆を支援するWebアプリです(個人開発・ポートフォリオ)。作品と章の管理、文字数と執筆時間の進捗、ステータス別タブ、期間検索、テキスト出力を予定しています。バックエンドは持たず、APIは MSW で再現します。

> 現在は「段階0: 開発基盤づくり」まで完了しており、機能はまだありません。

## 進め方(ハーネスとループ)

実装の大部分は Claude Code(Superpowers プラグイン)に任せ、方針の判断(選択肢の決定)、コマンドの許可、ブラウザでの確認、PRのレビューとマージは人が行います。機能より先に、AIの出力を自動で検証する仕組み(ハーネス)を整えました。

- **ハーネス**: [CLAUDE.md](CLAUDE.md)(開発ルール)、`npm run check`(lint・型・テスト・ビルド)、編集のたびに整形と lint を行い違反を差し戻す hook、権限設定、PRごとの CI
- **ループ**: 計画(writing-plans)→ テスト先行(test-driven-development)→ 実装(executing-plans)→ `npm run check` → 実装とは別のAIが、読み取り専用でブランチ全体をレビュー → PR と CI → 人がレビューしてマージ

AIの間違いや人が直した点は、[docs/ai-log.md](docs/ai-log.md) に実例だけを記録します。

## 技術スタック

Vite / React / TypeScript(strict) / Tailwind CSS / shadcn/ui / jotai / TanStack Query / MSW / Vitest + Testing Library / ESLint / Prettier / GitHub Actions(Playwright は段階3で導入予定)

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
  lib/              共通ユーティリティ(QueryClient など)
  mocks/            MSW のハンドラ(ブラウザ用・テスト用)
  test/             テストの共通設定
docs/ai-log.md      AIログ
```

`src/features/sample/` は各ライブラリの配線確認用のサンプルです。段階1の最初に削除します。

## デモ

準備中
