from taka-4602/chunithm-best-generator
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
