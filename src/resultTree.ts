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

    getParent(element: SearchResultTreeItem): Thenable<SearchResultTreeItem|undefined> {
        if(element.contextValue === 'root') {
            return Promise.reject();
        }
        else if(element.contextValue === 'file') {
            return Promise.resolve(this.searchResultTree.roots.find(value => { return value.search_id === element.search_id; }));
        }
        else if(element.contextValue === 'result') {
            return Promise.resolve(this.searchResultTree.findOrCreateFileNodeToAdd(element.search_id, element.file));
        }

        return Promise.reject();
    }

    public deleteNode(node :SearchResultTreeItem) {
        this.searchResultTree.deleteNode(node);
        this.refresh();
    }

    public renameNode(node :SearchResultTreeItem, new_name: string) {
        this.searchResultTree.renameRootNode(node, new_name);
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

    public getNextResult(item :SearchResultTreeItem) {
        return this.searchResultTree.getNextResult(item);
    }

}

export class SearchResultTree {

    // the label of root must be search_id
    public roots: SearchResultTreeItem[] = [];

    private readonly MAX_RESULT = 10240;
    private numOfResults = 0;

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
            
            // abort adding item when over the limit
            //check for root
            if(this.findRoot(search_id).numOfResults > this.MAX_RESULT) {
                this.findRoot(search_id).label = this.findRoot(search_id).label + " !!!!!incomplete!!!!!";
                let e :Error = new Error(`The result of ${search_id} is too much for tree view(limit is: ${this.MAX_RESULT}).\n Please retry search with more specific word.`);
                throw e;
            }
            // check for all result in tree view
            if(this.numOfResults > this.MAX_RESULT) {
                this.findRoot(search_id).label = this.findRoot(search_id).label + " !!!!!incomplete!!!!!";
                let e :Error = new Error(`There are too match results in tree view(limit is: ${this.MAX_RESULT}).\n Please delete unnessesary results or retry search with more specific word.`);
                throw e;
            }
            
            let result = this.parseLine(it);

            if (result) {
                if (fs.existsSync(result!.file) === true) {
                    let node = this.findOrCreateFileNodeToAdd(search_id, result!.file);
                    node!.addChildToFileNode(
                        SearchResultTreeItem.createResultNode(
                            search_id, result!.file, result!.line, result!.body,
                            vscode.TreeItemCollapsibleState.None));
                    
                    // update number of results. 
                    this.findRoot(search_id).numOfResults++;
                    this.numOfResults++;
                }
            }
        });
    }

    public findOrCreateFileNodeToAdd(search_id: string, file: string)
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
            // update number of results. 
            this.numOfResults = this.numOfResults - this.findRoot(node.search_id).numOfResults++;

            this.roots.splice(this.roots.findIndex(value => {return value.search_id === node.search_id;}), 1);
        }
        else if(node.contextValue === 'file') {
            
            let root = this.roots[this.roots.findIndex(value => {return value.search_id === node.search_id;})];
            let idx_node_to_delete = root.children.findIndex(value => {return value.label === node.label;});
            // update number of results. 
            let amount_of_decrement =  root.children[idx_node_to_delete].children.length;
            this.findRoot(node.search_id).numOfResults 
                = this.findRoot(node.search_id).numOfResults - amount_of_decrement;
            this.numOfResults = this.numOfResults - amount_of_decrement;
            root.children.splice(idx_node_to_delete, 1);
        }
        else if(node.contextValue === 'result') {
            let root = this.roots[this.roots.findIndex(value => {return value.search_id === node.search_id;})];
            let file = root.children[root.children.findIndex(value => {return value.label === node.file;})];
            //FIXME: If rg put out multiple matches located at same line as different results,
            //       below code can't idetify those results.
            //       Therefore the first added result will be deleted forcely in this case.... 
            //       But we doesn't need to care for default settings of rg option.
            file.children.splice(file.children.findIndex(value => {return (value.body === node.body) && (value.line === node.line);}), 1);

            //update number of results
            this.numOfResults--;
            root.numOfResults--;
        }
    }

    public renameRootNode(node :SearchResultTreeItem, new_name :string) {
        if(node.contextValue !== 'file') {
            // we allow duplicated name because we can indentify all items by jump location. 
            // if(this.roots.findIndex(value => {return value.label === new_name;}) < 0) {
                node.label = new_name;
            // }
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

    private findRoot(search_id :string) {

        return this.roots[this.roots.findIndex(item => { return item.search_id === search_id; })];
    }

    public getNextResult(item :SearchResultTreeItem) {
        if(item.contextValue === "root") {
            return item.children![0].children![0];
        }
        else if(item.contextValue === "file") {
            return item.children[0];
        }
        else if(item.contextValue === "result"){
            let parent = this.findOrCreateFileNodeToAdd(item.search_id, item.file);

            if (parent) {
                let result_idx = parent!.children.findIndex(value => {
                    return (value.body === item.body) && (value.line === item.line);
                });

                if (result_idx < parent.children.length - 1) {
                    return parent.children[result_idx + 1];
                }
                else {
                    let file_idx = this.findRoot(parent.search_id).children.findIndex(value => {
                        return value.file === parent!.file;
                    });

                    if(file_idx < this.findRoot(parent.search_id).children.length - 1) {
                        return this.findRoot(parent.search_id).children[file_idx + 1].children[0];
                    }
                }
            }
        }

        return undefined;
    }
}

export class SearchResultTreeItem extends vscode.TreeItem {

    public search_id :string = "";
    public file: string = "";
    public line: number = 0;
    public body: string = "";

    public numOfResults = 0;

    public children: SearchResultTreeItem[] = [];

    public static createRootNode(
        search_id: string,
        collapsibleState: vscode.TreeItemCollapsibleState): SearchResultTreeItem {
        let node = new SearchResultTreeItem(search_id, collapsibleState);
        node.contextValue = "root";
        node.search_id = search_id;
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
        search_id :string,
        file: string,
        line: number,
        body: string,
        collapsibleState: vscode.TreeItemCollapsibleState): SearchResultTreeItem {
        let node = new SearchResultTreeItem(body, collapsibleState);
        node.search_id = search_id;
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