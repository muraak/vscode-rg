'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as vscode from 'vscode';

export class SearchResultProvider implements vscode.TreeDataProvider<SearchResultTreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<SearchResultTreeItem | undefined>
        = new vscode.EventEmitter<SearchResultTreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<SearchResultTreeItem | undefined>
        = this._onDidChangeTreeData.event;

    private searchResultTree = new SearchResultTree();

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    add(search_id :string) {
        this.searchResultTree.addResultNode(search_id);
        this.refresh();
    }

    update(search_id :string, result_txt :string) {
        this.searchResultTree.updateResultNode(search_id, result_txt);
        this.refresh();
    }

    getTreeItem(element: SearchResultTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SearchResultTreeItem): Thenable<SearchResultTreeItem[]> {

        if(!element)
        {
            return new Promise(resolve => resolve(this.searchResultTree.roots));
        }
        else {

            if(element.contextValue === "root" || element.contextValue === "file") {
                return new Promise(resolve => resolve(element.children));
            }
            else 
            {
                return Promise.resolve([]);
            }
        }
    }

    public deleteNode(node :SearchResultTreeItem) {
        this.searchResultTree.deleteNode(node);
        this.refresh();
    }

    // public foldNodesAtSameLevel(contextValue: string, search_id?: string) {
        
    //     let roots = this.searchResultTree.roots.slice();
    //     this.searchResultTree.roots = [];
    //     this.refresh();
        
    //     if(contextValue === "root") {
    //         for(var i = 0; i < roots.length; i++)
    //         {
    //             this.searchResultTree.roots[i].collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    //         }
    //     }
    //     else if(contextValue === "file"){
    //         if(search_id) {
    //             let parent = roots[roots.findIndex(value => {return value.label === search_id;})];

    //             for(var j = 0; j < parent.children.length; j++){
    //                 parent.children[j] = SearchResultTreeItem.recreateFileNode( parent.children[j], vscode.TreeItemCollapsibleState.Collapsed);
    //             }
    //         }
    //     }

    //     this.searchResultTree.roots = roots.slice();

    //     this.refresh();
    // }

}

export class SearchResultTree {

    // the label of root must be search_id
    public roots: SearchResultTreeItem[] = [];

    public addResultNode(search_id: string) {

        if (this.roots.findIndex(value => { return value.id === search_id; }) < 0) {

            this.roots.push(
                SearchResultTreeItem.createRootNode(
                    search_id, vscode.TreeItemCollapsibleState.Expanded));
        }
    }

    public updateResultNode(search_id: string, result_txt: string) {

        // each line of reult_txt should be a single result of grep
        result_txt.split(/\r?\n/).forEach(it => {
            let result = this.parseLine(it);

            if (result) {
                if (fs.existsSync(result!.file) === true) {
                    let node = this.findOrCreateFileNodeToAdd(search_id, result!.file);
                    node!.addChildToFileNode(
                        SearchResultTreeItem.createResultNode(
                            result!.file, result!.line, result!.body,
                            vscode.TreeItemCollapsibleState.None));
                }
            }
        });
    }

    private findOrCreateFileNodeToAdd(search_id: string, file: string)
        : SearchResultTreeItem | undefined {

        let search = this.roots.find((value) => { return value.label === search_id; });

        if (search) {
            let file_node = search.children.find((value) => {return value.label === file; });

            if(file_node) {
                return search.children[search.children.indexOf(file_node)];
            }
            else {
                let new_file_node 
                    = SearchResultTreeItem.createFileNode(
                        search_id, file, vscode.TreeItemCollapsibleState.Expanded);
                
                search.children.push(new_file_node);

                return new_file_node;
            }
        }
        else {
            return undefined;
        }
    }

    public deleteNode(node :SearchResultTreeItem) {
        if(node.contextValue === 'root') {
            this.roots.splice(this.roots.findIndex(value => {return value.label === node.label;}), 1);
        }
        else if(node.contextValue === 'file') {
            let root = this.roots[this.roots.findIndex(value => {return value.label === node.search_id;})];
            root.children.splice(root.children.findIndex(value => {return value.label === node.label;}), 1);
        }
        else if(node.contextValue === 'result') {
            let root = this.roots[this.roots.findIndex(value => {return value.search_id === node.search_id;})];
            let file = root.children[root.children.findIndex(value => {return value.label === node.file;})];
            file.children.splice(file.children.findIndex(value => {return (value.label === node.label) && (value.line === node.line);}), 1);
        }
    }

    private parseLine(line_of_search_result: string)
        : { file: string, line: number, body: string } | undefined {

        let match = line_of_search_result.match(/(^.*):(?!\\)([0-9]+):(.*)$/);

        if (match !== null) {
            return { file: match[1], line: parseInt(match[2]), body: match[3] };
        }
        else {
            return undefined;
        }
    }
}

export class SearchResultTreeItem extends vscode.TreeItem {

    public search_id :string = "";
    public file: string = "";
    public line: number = 0;
    public body: string = "";

    public children: SearchResultTreeItem[] = [];

    public static createRootNode(
        search_id: string,
        collapsibleState: vscode.TreeItemCollapsibleState): SearchResultTreeItem {
        let node = new SearchResultTreeItem(search_id, collapsibleState);
        node.contextValue = "root";
        return node;
    }

    public static createFileNode(
        search_id: string,
        file: string,
        collapsibleState: vscode.TreeItemCollapsibleState): SearchResultTreeItem {
        let node = new SearchResultTreeItem(file, collapsibleState);
        node.search_id = search_id;
        node.contextValue = "file";
        return node;
    }

    // public static recreateFileNode(oldNode :SearchResultTreeItem, newCollapseState :vscode.TreeItemCollapsibleState) {
        
    //     let new_node = this.createFileNode(oldNode.search_id, (oldNode.label)?oldNode.label:"", newCollapseState);
    //     new_node.children = oldNode.children.slice();

    //     return new_node;
    // }

    public static createResultNode(
        file: string,
        line: number,
        body: string,
        collapsibleState: vscode.TreeItemCollapsibleState): SearchResultTreeItem {
        let node = new SearchResultTreeItem(body, collapsibleState);
        node.file = file;
        node.line = line;
        node.body = body;
        node.contextValue = "result";
        node.command = {
            command: "rg.jumpToSearchResult", 
            title: '', 
            arguments: [file, line]};
        return node;
    }

    public addChildToFileNode(child: SearchResultTreeItem) {
        if (this.contextValue === 'file') {
            if (child.contextValue === 'result') {
                this.children.push(child);
            }
        }
    }
}