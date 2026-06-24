# shaln-bf/chunithm-external-tools
---
* 本ツールを使用する過程及び結果における如何なる損害も自己責任の上ご利用ください。
* 本ツールはあくまでもより快適なCHUNITHMのためのツールであり、CHUNITHM-NETサーバーなどへの不正/過剰なアクセスは避けてください。

## 画像ジェネ
べ枠/新曲枠の画像のサムネを生成します。デフォルトで1分弱。
同時にグラフも生成してくれるヨ。
表示するもの
* それぞれの枠に入っている曲
    * そいつらの→
    * サムネ
    * タイトル
    * スコアとRANK
    * 定数
    * プレイ回数
    * レート
```js
javascript:(function(){
    const script = document.createElement('script');
    script.src = "https://shaln-bf.github.io/chunithm-external-tools/main.js?" + new Date().getTime();
    document.body.appendChild(script);
})();
```

## Ratnator.js
有料版専用のテキスト出力ツールです。
`ratingDetailBest` / `ratingDetailRecent` から BEST / NEW の対象曲を取得して、以下をまとめて表示します。

* 現在レーティング
* Best / New それぞれの Ave
* OverPower
* BEST / NEW 枠それぞれの対象曲一覧
    * 曲名と難易度
    * プレイ回数
    * 譜面定数
    * 単曲レート
    * スコア / ランク

```js
javascript:(function(){
    const script = document.createElement('script');
    script.src = "https://shaln-bf.github.io/chunithm-external-tools/ratnator.js?" + new Date().getTime();
    document.body.appendChild(script);
})();
```