# vscode-rg README

vscode-rgはvscodeの使用性の低い検索機能を代替するための拡張機能です。

## 機能
コマンドパレットから以下の機能を利用できます。
- Rg Test：本エクステンションからripgrepが実行可能かテストします。
- Rg Quick Search：入力した検索ワードをワークスペースで横断検索します。
- Rg Detail Search：詳細な検索オプションを指定してワークスペースで横断検索します。

## 要求

※バージョン0.0.5以降はインストール不要になりました。

- [ripgrep](https://github.com/BurntSushi/ripgrep/releases)をインストールしてください。
- 環境変数に上記でインストールしたrg.exeへのパスを追加してください。

## 設定
- "rg.encoding": 検索時のエンコーディングを設定してください。（デフォルトは"utf-8"です。）
- "rg.quick.globe": Rg Quick Searchの実行時の検索対象ファイル，除外ファイルを設定できます。(Ripgrepの-gオプションと同じ書式で指定してください)
- "rg.quick.raw": Rg Quick Searchの実行時のオプションを設定できます。(Ripgrepのコマンドラインオプションと同じ書式で指定してください)

## 既知の問題
- 複数検索時，検索結果のタブが上書きされる。<br/>
以下の設定で回避できます。

```
 "workbench.editor.enablePreview": false
```

## 補足
### grep結果について
grep結果はVSCodeの終了/再起動時，または本エクステンションの無効化時に削除されます。<br/>
結果を残したい場合は[Ctrl]+[Shift]+[S]で"別の場所"に保存してください。

### ツリー表示で同一階層の折り畳み/展開がしたい
現在技術的な理由で実現できません。（vscodeのsearch機能も同様）
申し訳ないですが我慢してください。

## リリースノート
### 0.0.1
プロトタイプ初版

### 0.0.2
結果が逐次表示されるように変更

### 0.0.3
結果が更新される度にエディタが表示されないように変更

### 0.0.4
- 詳細な検索機能を追加
- アイコンを追加
- 以下の設定を追加
    ```
    "rg.quick.globe"
    "rg.quick.raw"
    ```
### 0.0.5
- 検索結果のツリー表示に対応（複数の検索結果を表示できます）
- rgコマンドをvscode同梱のものを使うように変更（以降はrg.exeのインストール不要です）

### 0.0.6
#### バグ修正
- 検索結果が多すぎるとフリーズする不具合を修正
    - ツリー表示がパンクしていたことが原因。<br>
        表示制限(結果数：102400)を超えた場合エラーメッセージを表示させツリーへの追加をストップするように修正した。<br>
        また，すべての結果が表示できなかった検索結果名に"!!!!incomlete!!!!"を付記するようにした。<br>
        ※ファイル表示は問題ない。

### 1.0.0
リリース初版予定
