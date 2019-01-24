'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import { ExtensionContext, commands, window, workspace, Uri, ViewColumn, WebviewPanel, StatusBarAlignment, Range, Position, TextEditorRevealType, Selection } from 'vscode';
import * as vscode from 'vscode';
import * as child_process from "child_process";
import { tmpdir } from 'os';
import * as path from 'path';
import { appendFile, unlink } from 'fs';
import * as Moment from 'moment';
import * as fs from 'fs';
import * as iconv from "iconv-lite";
import { SearchResultProvider } from "./resultTree";


let genarated_tmp_files: string[] = [];
let searchResultProvider = new SearchResultProvider();

const rg_path = path.join(vscode.env.appRoot, "node_modules.asar.unpacked", "vscode-ripgrep", "bin", "rg");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('rg.test', rgTest));
	context.subscriptions.push(commands.registerCommand('rg.quickSearch', rgQuickSearch));
	context.subscriptions.push(commands.registerCommand('rg.detailSearch', () => { showDetailSearchWebView(context); }));
	
	// bind the function to context menu of search result
	// context.subscriptions.push(commands.registerCommand('searchResult.foldSameLevelNode', (node) => { 
		// searchResultProvider.foldNodesAtSameLevel(node.contextValue, node.search_id);
	// }));

	context.subscriptions.push(commands.registerCommand('searchResult.deleteNode', (node) => { 
		searchResultProvider.deleteNode(node);
	}));
	context.subscriptions.push(commands.registerCommand('searchResult.renameNode', (node) => { 
		window.showInputBox({prompt: "input the new name."}).then((value) => {
			if(node.contextValue !== 'file') {
				if(value) {
					searchResultProvider.renameNode(node, value);
				}
			}
		});
	}));

	// bind the function executed when search result item was selected 
	commands.registerCommand("rg.jumpToSearchResult", ((file, line) => {
		workspace.openTextDocument(Uri.file(file)).then((doc) => {
			window.showTextDocument(doc, undefined, true/*preserve focus*/).then((editor) => {
				editor.selection = new Selection(new Position(line - 1, 0), new Position(line - 1, 0));
				editor.revealRange(new Range(new Position(line - 1, 0),new Position(line - 1, 0)), TextEditorRevealType.InCenter);
				// take the focus back to result view
				commands.executeCommand("workbench.view.extension.rg-search-result");
			});
		});
	}));

	// searchResultProvider = new SearchResultProvider();

	window.registerTreeDataProvider('searchResult', searchResultProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {

	// !HACK
	// I did wanted to delete this temp file when this file closed in VSCode.
	// And I tried to do it by using onDidCloseTextDocument
	// but this event didn't fire when I expected to.
	// I googled it and finally realized that 
	// it seems to be troublesome (I wasted my fuckin' weekend...)

	// remove tmp files
	genarated_tmp_files.forEach(element => {
		unlink(element, () => { });
	});

	// clear
	genarated_tmp_files = [];
}

async function rgTest() {
	child_process.execFile(
		rg_path, ["--version"],
		{ encoding: "buffer" },
		(error, stdout, stderr) => {
			if (stdout) {
				window.showInformationMessage("It works fine! => " + iconv.decode(stdout, getEncoding()));
			}

			if (stderr) {
				window.showErrorMessage(iconv.decode(stderr, getEncoding()));
			}
		});
}

async function rgQuickSearch() {
	const result = await window.showInputBox({
		prompt: 'input the search word.',
	});

	if (result) {
		rgDetailSearch({
			sword: result,
			globe: workspace.getConfiguration("rg", null).get<string>("quick.globe"),
			raw: workspace.getConfiguration("rg", null).get<string>("quick.raw")
		});
	}
}

function rgDetailSearch(options_obj: any) {

	let sword = options_obj.sword;

	if(wv_panel)
	{
		wv_panel.dispose();
	}

	if (isString(sword)) {
		let options: string[] | undefined = undefined;
		let globe = options_obj.globe;
		if (isString(globe)) {
			if(globe !== "") {
				options = globe.replace(/\s/g, '').split(",").map((value) => { return "-g " + value; });
			}
		}
		
		let raw = options_obj.raw;
		if(isString(raw)) {
			if(raw !== "") {
				if(options){
					options = options.concat(raw.split(/\s|\n/g));
				}
				else {
					options = raw.split(/\s|\n/g);
				}
			}
		}

		execRgCommand(sword, options);
	}
}

function isString(x: any): x is string {
	return typeof x === "string";
}

function execRgCommand(input: string, options?: string[]) {

	let tmp_file_name = getTmpFileName(input);
	let search_id = getSearchId(input);
	let file_path = path.join(tmpdir(), tmp_file_name);
	let file_uri = Uri.file(file_path);

	appendFile(file_path, "", err => {
		if (!err) {

			// add to internal manage array
			genarated_tmp_files.push(file_path);

			// add tree to search result
			searchResultProvider.add(search_id);
			// show search result view
			commands.executeCommand("workbench.view.extension.rg-search-result");

			workspace.openTextDocument(file_uri).then(document => {
				window.showTextDocument(document).then(() => {

					if (workspace.workspaceFolders) {
						let dir_path: string = workspace.workspaceFolders[0].uri.fsPath;
						let args = ["--line-number", input, dir_path, "-E " + getEncoding()];
						if (options) {
							args = args.concat(options);
						}

						let proc = child_process.spawn("rg", args, { shell: true, cwd: path.dirname(rg_path) });
						proc.stdout.setEncoding("utf-8");

						let icon = window.createStatusBarItem(StatusBarAlignment.Right);
						icon.color = "yellow";
						icon.text = "$(pulse)rg searching...";
						icon.show();

						proc.stdout.on('data', (data) => {
							
							// update tree
							searchResultProvider.update(search_id, data.toString());
							appendFile(file_path, data.toString(), err => {
								if (err) {
									window.showErrorMessage(err.message);
								}
							});
						});

						proc.stderr.on('data', (data) => {
							searchResultProvider.update(search_id, data.toString());
							appendFile(file_path, data.toString(), err => {
								if (err) {
									window.showErrorMessage(err.message);
								}
							});
						});

						proc.on("exit", () =>{
							icon.dispose();
						});
					}
				});
			});
		}
	});
}

function getTmpFileName(sword: string): string {
	let file_name = "vscode-rg-result_";
	file_name += sword + "_";
	file_name += Moment().format("YYYYMMDDHHmmssSSS");
	return file_name + ".log";
}

function getSearchId(sword: string) :string {
	return sword + "_" + Moment().format("YYYYMMDDHHmmssSSS");
}

function getEncoding() {
	let encoding = workspace.getConfiguration("rg", null).get<string>("encoding");
	return (encoding) ? encoding : "utf-8";
}

let wv_panel: WebviewPanel | undefined = undefined;

function showDetailSearchWebView(context: ExtensionContext) {

	if (wv_panel) {
		wv_panel.reveal(ViewColumn.Beside);
	}
	else {
		// create and show webview panel
		wv_panel = window.createWebviewPanel(
			"rgDetailSearch", "Rg Detail Search", ViewColumn.Beside, { enableScripts: true });
		wv_panel.webview.html = getDetailSearchViewHtml(context);

		// Handle messages from the webview
		wv_panel.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'detailSearch':
					rgDetailSearch(message);
					return;
			}
		});

		// Release the wv_panel when that is disposed
		wv_panel.onDidDispose(() => {
			wv_panel = undefined;
		});
	}
}

function getDetailSearchViewHtml(context: ExtensionContext) {
	return fs.readFileSync(
		Uri.file(path.join(context.extensionPath, 'html', 'detailSearch.html')).fsPath,
		'utf8');
}
