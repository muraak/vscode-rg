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

## Release Notes
### 1.0.0

Initial release of vscode-rg

**Enjoy!**
