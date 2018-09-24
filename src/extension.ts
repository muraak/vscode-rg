'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, commands, window, workspace, Uri} from 'vscode';
import * as child_process from "child_process";
import * as iconv from "iconv-lite";
import { tmpdir } from 'os';
import * as path from 'path';
import { appendFile, unlink } from 'fs';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('rg.test', rgTest));
	context.subscriptions.push(commands.registerCommand('rg.simpleSearch', rgSimpleSearch));
}

// this method is called when your extension is deactivated
export function deactivate() {
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

function execRgCommand(input: string) 
{

	let file_path = path.join(tmpdir(), getTmpFileName());
	let file_uri =  Uri.file(file_path);

	appendFile(file_path, "", err => {
		if (!err) {
			workspace.openTextDocument(file_uri).then(document => {
				
				window.showTextDocument(document).then(() =>{
					if (workspace.workspaceFolders) {
						let dir_path: string = workspace.workspaceFolders[0].uri.fsPath;
						let proc = child_process.spawn("rg", ["--line-number", input, dir_path, "-E " + getEncoding()], {shell: true});
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
	
						proc.stdout.on('end', () =>{
							// !HACK
							// I did wanted to delete this temp file when this file closed in VSCode.
							// And I tried to do it by using onDidCloseTextDocument
							// but this event didn't fire when I expected to.
							// I googled it and finally realize that 
							// it seems to be troublesome (by wasting my weekend...)
							// So I changed to this way and it works because the content of this file
							// will be remained in the vscode editor even after deleting this file. 
							unlink(file_path, ()=>{});
						});
					}
				});
			});
		}
	});
}

function getTmpFileName(): string {
	let file_name = "vscode-rg-result";
	return file_name + ".log";
}

function getEncoding() {
	let encoding = workspace.getConfiguration("rg", null).get<string>("encoding");
	return (encoding) ? encoding : "utf-8";
}
