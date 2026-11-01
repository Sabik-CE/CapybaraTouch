# CapybaraTouch

NFCカードから開く、モバイル対応のプロフィールサイトです。

## 公開URL

https://sabik-ce.github.io/CapybaraTouch/

## 内容を編集する

プロフィール内容は [`content/profile.md`](content/profile.md) にまとまっています。

名前、連絡先、自己紹介、経歴、カード、画像URLを変更するときは、原則としてこのMarkdownファイルだけを編集してください。`main` ブランチへプッシュすると、GitHub Pagesにも反映されます。

表示の仕組みは次のように分離しています。

- `content/profile.md`: 表示する内容
- `content.js`: Markdownを読み込んで表示する処理
- `index.html`: デザインと画面構造

ローカル確認では、ブラウザーで `index.html` を直接開かず、リポジトリのディレクトリで簡易Webサーバーを起動してください。

```powershell
python -m http.server 8000
```

その後、`http://localhost:8000/` を開きます。
