

export interface ColumnDefinition {
    key: string;
    title: string;
}


export class Column {

}




export class Table {
    public container: HTMLElement;
    public columnDefinitions: ColumnDefinition[];
    constructor({ container, columnDefinitions }: { container: HTMLElement, columnDefinitions: ColumnDefinition[] }) {
        this.container = container;
        this.columnDefinitions = columnDefinitions;
        this.render();
    }



    async render() {
        const tableElement = document.createElement("div");
        tableElement.innerHTML = `
            <div class="ss-table">
                <div class="ss-table-head">
                    <div class="ss-table-row">
                        <div class="ss-table-header-columns-pinned-left">
                        </div>
                        <div class="ss-table-header-columns">
                            
                        </div>
                        <div class="ss-table-header-columns-pinned-right">
                        </div>
                    </div>
                </div>
                <div class="ss-table-body">
                    <div class="ss-table-body-row-columns-pinned-left">
                        
                    </div>
                    <div class="ss-table-body-rows">
                        <div class="ss-table-body-row">
                            <div class="ss-table-body-cell">
                            </div>
                        </div>
                    </div>
                    <div class="ss-table-body-row-columns-pinned-right">
                    </div>
                </div>
                <div class="ss-table-footer">
                    <div class="ss-table-footer-row-columns-pinned-left">
                    </div>
                    <div class="ss-table-footer-rows">
                        <div class="ss-table-footer-row">
                        </div>
                    </div>
                    <div class="ss-table-footer-row-columns-pinned-left">
                    </div>
                </div>
            </div>
        `;
        const headersElement = tableElement.querySelector(".ss-table-header-columns")!;
        for (const columnDefinition of this.columnDefinitions) {
            const headerElement = document.createElement("div");
            headerElement.classList.add("ss-table-cell");
            headerElement.classList.add("ss-table-header-column");
            headerElement.textContent = columnDefinition.title;
            headersElement.append(headerElement);
        }
        this.container.innerHTML = '';
        this.container.append(tableElement);
    }
}