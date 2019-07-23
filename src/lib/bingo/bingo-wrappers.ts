export class GridFieldWrapper {
    public row: any;
    public column: any;
    public submitted: boolean;
    public word: any;
    public grid: any;
    /**
     * @param row {Object} - the resulting row
     */
    constructor(row: any) {
        this.row = row.grid_row;
        this.column = row.grid_column;
        this.submitted = row.submitted;
        // TODO
        //this.word = new WordWrapper(row.word_id, row);
        //this.grid = new GridWrapper(row.grid_id);
    }
}
