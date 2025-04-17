import { FieldChangesEvent } from "./change-set";
import { Field } from "./field";

export class Fields extends EventTarget {
    public list: Field[];

    constructor() {
        super();
        this.list = [];
        this._fieldChangesEventListener = this._fieldChangesEventListener.bind(this);
    }

    _fieldChangesEventListener(event: Event) {
        this.dispatchEvent(new FieldChangesEvent((event as FieldChangesEvent).changes));
    }

    add(field: Field) {
        if (this.list.includes(field)) return false;
        field.addEventListener("changes", this._fieldChangesEventListener);
        this.list.push(field);
        return true;
    }

    remove(field: Field) {
        if (!this.list.includes(field)) return false;
        field.removeEventListener("changes", this._fieldChangesEventListener);
        this.list.splice(this.list.indexOf(field), 1);
        return true;
    }

    get(fieldName: string): Field[] {
        return this.list.filter(field => field.name === fieldName);
    }

    [Symbol.iterator](): Iterator<string> {
        return new Set(this.list.map(field => field.name)).values();
    }
}