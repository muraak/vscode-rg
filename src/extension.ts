'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {ExtensionContext, commands, window, workspace, /*TextEdit,*/ Position} from 'vscode';
import * as child_process from "child_process";
import * as iconv from "iconv-lite";


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand('rg.test', rgTest));
	context.subscriptions.push(commands.registerCommand('rg.simpleSearch', rgSimpleSearch));
}

// this method is called when your extension is deactivated
export function deactivate() {
}

async function rgTest()
{
	child_process.execFile(
		"rg", ["--version"],
		{encoding: "buffer"},
		(error, stdout, stderr) => {
		if(stdout)
		{
			window.showInformationMessage("It works fine! => " + iconv.decode(stdout, getEncoding()));
		}

		if(stderr)
		{
			window.showErrorMessage(iconv.decode(stderr, getEncoding()));
		}
	});	
}

async function rgSimpleSearch()
{
	const result = await window.showInputBox({
		prompt: 'input the search word.',
	});

	if(result)
	{
		if(workspace.workspaceFolders)
		{
			let dir_path :string = workspace.workspaceFolders[0].uri.fsPath;

			// child_process.execFile(
			// 	"rg", ["--line-number", result, dir_path, "-E " + getEncoding()],
			// 	{encoding: "buffer"}, 
			// 	(error, stdout, stderr) => {
			// 		if(stdout)
			// 		{
			// 		workspace.openTextDocument({content: iconv.decode(stdout, "utf-8"), language: 'log'}).then(document => {
			// 			window.showTextDocument(document);
			// 		});
			// 	}

			// 	if(stderr)
			// 	{
			// 		window.showErrorMessage(iconv.decode(stderr, getEncoding()));
			// 	}
			// });
			workspace.openTextDocument({language: 'log'}).then(document => {
				
				let proc = child_process.spawn("rg", ["--line-number", result, dir_path, "-E " + getEncoding()]);
				proc.stdout.setEncoding("utf-8");
				proc.stdout.on('data', (data) => {
					window.showTextDocument(document).then(e =>{
						e.edit(edit => {
							edit.insert(new Position(document.lineCount, 0), data.toString());
						});
					});
				});

			});
		}
	}
}

function getEncoding()
{
	let encoding = workspace.getConfiguration("rg", null).get<string>("encoding");
	return (encoding) ? encoding : "utf-8";
}