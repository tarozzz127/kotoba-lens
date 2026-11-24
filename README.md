# ことばレンズ

カメラに写した身近なものを、学びたいことばに。

**使う:** https://tarozzz127.github.io/kotoba-lens/

iPadのSafariで開き、学ぶことばをえらんで「カメラをはじめる」を押してください。
カメラを許可してものを大きく写すと、名前が出ます。「写真をえらぶ」や「写真でためす」でも使えます。

## できること

- 身近な80種類をiPad内で見分け、英語・韓国語・中国語・フランス語・スペイン語・ドイツ語・イタリア語で表示。
- 写真やカメラの映像を外に送らず、保存もしません。はじめの準備には約20MBの通信が必要です。
- iPad内の音声で発音を再生。言語に合う音声がないときは、そのことを表示します。
- 気になったことばを、このブラウザの「ことば帳」に保存（最大200件）。写真は保存しません。
- カメラは「とめて見る」「やめる」、タブを離れる操作で止まります。

見分ける名前はまちがうことがあります。文字や文章の翻訳はしません。
履歴やWebサイトのデータを消すと、ことば帳も消えます。別のiPadとの共有はありません。

## 開発する人へ

Node.js 24 LTSを使用します。Reactや外部API、APIキー、サーバーは不要です。

```sh
npm ci
npm run dev
# http://localhost:5173/kotoba-lens/
npm test
npm run build
npm run preview
```

- ViteとJavaScript。TensorFlow.js 4.22とCOCO-SSD 2.2.3（lite_mobilenet_v2）を使います。
- ライブラリ・学習済みデータ・おためし写真はすべて同じサイトから配信。外部の認識・翻訳・音声API、解析、外部フォントは使いません。
- `public/model/` に学習済みデータを同梱し、初回の約20MBダウンロードを除き、推論はブラウザ内です。オフライン動作は保証しません。
- `src/words.js` に80種類×7言語と日本語を収録。判定は確かさ0.55以上、同時に5種類まで表示します。
- `localStorage` は言語設定と単語の識別子だけ。画像は一時的なメモリー上で扱います。
- `npm test` は公式COCO-SSDクラスとの全語照合、判定の絞り込み、モデルの欠損を確認します。
- 既存のpre-commitフックはありません。PRではGitHub Actionsがテストとビルドを実行します。
- `main` に入るとActionsがGitHub Pagesへ公開します。PagesのSourceは「GitHub Actions」です。

## 利用している素材

- アプリのコード・絵・アイコン: MIT（`LICENSE`）。
- TensorFlow.js / COCO-SSDと学習済みデータ: Google、Apache 2.0。`public/model/LICENSE.txt`を参照。
- おためしのねこの写真: [Mikhail Vasilyev / Unsplash](https://unsplash.com/photos/2F3HEGx5fC0)、[Unsplash License](https://unsplash.com/license)。加工は表示サイズの調整のみ。
