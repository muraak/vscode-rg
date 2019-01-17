'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';

export class ResultParser {
    public static getFileList(path :string) :string[] {
        
        let search_results = fs.readFileSync(path, "utf-8");

        let file_list: string[] = [];

        search_results.split(/\r?\n/).forEach(it => {
            // let file_path = it.slice(undefined, it.search(/:(?!\\)/));
            let result = ResultParser.parseLine(it);

            if(result){
                if(fs.existsSync(result!.file) === true) {
                    if(file_list.find(value => { return value === result!.file; }) === undefined) {
                        file_list.push(result!.file);
                    }
                }
            }
        });
        
        return file_list;
    }

    public static parseLine(line_of_search_result :string) :{file: string, line: number, body: string} | undefined {    

        let match = line_of_search_result.match(/(^.*):(?!\\)([0-9]+):(.*)$/);

        if(match !== null) {
            return {file: match[1], line: parseInt(match[2]), body: match[3]};
        }
        else {
            return undefined;
        }
    }
}