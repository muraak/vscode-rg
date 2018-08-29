'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {ExtensionContext, commands, window, workspace} from 'vscode';
import * as child_process from "child_process";

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
	child_process.exec("rg --version",(error, stdout, stderr) => {
		if(stdout)
		{
			window.showInformationMessage("It works fine! => " + stdout);
		}

		if(stderr)
		{
			window.showErrorMessage(stderr);
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
			let cmd :string = "rg --line-number " + result + " " + dir_path;

			child_process.exec(cmd, (error, stdout, stderr) => {
				if(stdout)
				{
					// const newFile = Uri.parse('untitled:' + path.join(dir_path, 'result.log'));
					// workspace.openTextDocument(newFile).then(document => {
					// 	window.showTextDocument(document).then(editor => {
					// 		editor.edit(edit =>{
					// 			edit.insert(new Position(0, 0), stdout);
					// 		});
					// 	});
					// });

					workspace.openTextDocument({content: stdout, language: 'log'}).then(document => {
						window.showTextDocument(document);
					});
				}

				if(stderr)
				{
					window.showErrorMessage(stderr);
				}
			});
		}
	}
}