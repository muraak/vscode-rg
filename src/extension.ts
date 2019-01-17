'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import { ExtensionContext, commands, window, workspace, Uri, ViewColumn, WebviewPanel, StatusBarAlignment } from 'vscode';
import * as child_process from "child_process";
import { tmpdir } from 'os';
import * as path from 'path';
import { appendFile, unlink } from 'fs';
import * as Moment from 'moment';
import * as fs from 'fs';
import * as iconv from "iconv-lite";
import * as reultTree from "./resultTree";


let genarated_tmp_files: string[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('rg.test', rgTest));
	context.subscriptions.push(commands.registerCommand('rg.quickSearch', rgQuickSearch));
	context.subscriptions.push(commands.registerCommand('rg.detailSearch', () => { showDetailSearchWebView(context); }));
}

// this method is called when your extension is deactivated
export function deactivate() {

	// !HACK
	// I did wanted to delete this temp file when this file closed in VSCode.
	// And I tried to do it by using onDidCloseTextDocument
	// but this event didn't fire when I expected to.
	// I googled it and finally realized that 
	// it seems to be troublesome (I wasted my weekend...)

	// remove tmp files
	genarated_tmp_files.forEach(element => {
		unlink(element, () => { });
	});

	// clear
	genarated_tmp_files = [];
}

async function rgTest() {
	child_process.execFile(
		"rg", ["--version"],
		{ encoding: "buffer" },
		(error, stdout, stderr) => {
			if (stdout) {
				window.showInformationMessage("It works fine! => " + iconv.decode(stdout, getEncoding()));
			}

			if (stderr) {
				window.showErrorMessage(iconv.decode(stderr, getEncoding()));
			}
		});

	let list = reultTree.ResultParser.getFileList(Uri.parse("C:\\Users\\BG17059\\Desktop\\vscode-rg-result_20190117191023231.log").fsPath);

	console.log(list);
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

	let file_path = path.join(tmpdir(), getTmpFileName());
	let file_uri = Uri.file(file_path);

	appendFile(file_path, "", err => {
		if (!err) {

			// add to internal manage array
			genarated_tmp_files.push(file_path);

			workspace.openTextDocument(file_uri).then(document => {
				window.showTextDocument(document).then(() => {

					if (workspace.workspaceFolders) {
						let dir_path: string = workspace.workspaceFolders[0].uri.fsPath;
						let args = ["--line-number", input, dir_path, "-E " + getEncoding()];
						if (options) {
							args = args.concat(options);
						}
						let proc = child_process.spawn("rg", args, { shell: true });
						proc.stdout.setEncoding("utf-8");

						let icon = window.createStatusBarItem(StatusBarAlignment.Right);
						icon.color = "yellow";
						icon.text = "$(pulse)rg searching...";
						icon.show();

						proc.stdout.on('data', (data) => {
							appendFile(file_path, data.toString(), err => {
								if (err) {
									window.showErrorMessage(err.message);
								}
							});
						});

						proc.stderr.on('data', (data) => {
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

function getTmpFileName(): string {
	let file_name = "vscode-rg-result_";
	file_name += Moment().format("YYYYMMDDHHmmssSSS");
	return file_name + ".log";
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
