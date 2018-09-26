# vscode-rg README

## Features
コマンドパレットから以下の機能を利用できます。
- Rg Test：本エクステンションからripgrepが実行可能かテストします。
- Rg Simple Search：入力した検索ワードをワークスペースで横断検索します。

## Requirements
- [ripgrep](https://github.com/BurntSushi/ripgrep/releases)をインストールしてください。
- 環境変数に上記でインストールしたrg.exeへのパスを追加してください。

## Extension Settings
- "rg.encoding": 検索時のエンコーディングを設定してください。（デフォルトは"utf-8"です。）

## Known Issues
- 複数検索時，検索結果のタブが上書きされる。<br/>
以下の設定で回避できます。

```
 "workbench.editor.enablePreview": false
```

## Note
### grep結果について
grep結果はVSCodeの終了/再起動時，または本エクステンションの無効化時に削除されます。<br/>
結果を残したい場合は[Ctrl]+[Shift]+[S]で"別の場所"に保存してください。

## Release Notes
### 0.0.1
プロトタイプ初版
### 0.0.2
結果が逐次表示されるように変更
### 0.0.3
結果が更新される度にエディタが表示されないように変更
### 1.0.0
リリース初版予定

**Enjoy!**
