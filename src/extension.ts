'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, window, workspace, Uri } from 'vscode';
import * as child_process from "child_process";
import * as iconv from "iconv-lite";
import { tmpdir } from 'os';
import * as path from 'path';
import { appendFile, unlink } from 'fs';
import * as Moment from 'moment';


let genarated_tmp_files: string[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('rg.test', rgTest));
	context.subscriptions.push(commands.registerCommand('rg.simpleSearch', rgSimpleSearch));
}

// this method is called when your extension is deactivated
export function deactivate() {

	// 	// !HACK
	// 	// I did wanted to delete this temp file when this file closed in VSCode.
	// 	// And I tried to do it by using onDidCloseTextDocument
	// 	// but this event didn't fire when I expected to.
	// 	// I googled it and finally realized that 
	// 	// it seems to be troublesome (I wasted my weekend...)

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
}

async function rgSimpleSearch() {
	const result = await window.showInputBox({
		prompt: 'input the search word.',
	});

	if (result) {
		execRgCommand(result);
	}
}

function execRgCommand(input: string) {

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
						let proc = child_process.spawn("rg", ["--line-number", input, dir_path, "-E " + getEncoding()], { shell: true });
						proc.stdout.setEncoding("utf-8");

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
