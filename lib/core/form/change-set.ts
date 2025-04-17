import { Field, FieldChange, FieldChangeType, FieldMetaValueChange, FieldValueChange } from "./field";
import { getMetaDependencyKey } from "./utils";

export class FieldChangesEvent extends Event {
    constructor(public changes: FieldChange[]) {
        super("changes", { cancelable: true });
    }
}

interface FieldChangeFilter {
    type?: FieldChangeType | null;
    onlyCurrentState?: boolean;
    last?: boolean | null;
    processed?: boolean | null;
}

interface FieldAnyChangeFilter extends FieldChangeFilter {
    type?: FieldChangeType | null;
    metaKey?: never;
}

interface FieldValueChangeFilter extends FieldChangeFilter {
    type: FieldChangeType.Value;
    metaKey?: never;
}

interface FieldMetaValueChangeFilter extends FieldChangeFilter {
    type: FieldChangeType.MetaValue;
    metaKey?: string | null;
}

export class ChangeSet {
    private _changes: FieldChange[];
    private _maxSize: number;

    constructor(maxSize = 128) {
        this._changes = [];
        this._maxSize = maxSize;
    }

    trimProcessedChanges() {
        while (this._changes.length > this._maxSize) {
            const index = this._changes.findIndex(c => c.processed);
            if (index === -1) break;
            this._changes.splice(index, 1);
        }
    }

    add(change: FieldChange): void {
        let lastChange: FieldChange | undefined | null = null;
        if (change.type === FieldChangeType.Value) {
            lastChange = this.getFieldChange(change.field, { type: FieldChangeType.Value });
        } else if (change.type === FieldChangeType.MetaValue) {
            lastChange = this.getFieldChange(change.field, { type: FieldChangeType.MetaValue, metaKey: change.metaKey });
        }
        if (lastChange != null) {
            lastChange.last = false;
        }
        this._changes.push(change);
        this.trimProcessedChanges();
    }

    remove(change: FieldChange): void {
        this._changes.splice(this._changes.indexOf(change), 1);
    }

    getFieldChange(field: Field, filter: FieldValueChangeFilter): FieldValueChange | undefined;
    getFieldChange(field: Field, filter: FieldMetaValueChangeFilter): FieldMetaValueChange | undefined;
    getFieldChange(field: Field, filter: FieldAnyChangeFilter): FieldChange | undefined;
    getFieldChange(field: Field, { onlyCurrentState = true, last = true, processed = false, type = null, metaKey = null }: FieldAnyChangeFilter | FieldValueChangeFilter | FieldMetaValueChangeFilter = {}): FieldChange | undefined {
        let changes = this.getFieldChanges(field, { onlyCurrentState, last, processed, type });
        if (type === FieldChangeType.MetaValue && metaKey != null) {
            changes = (changes as FieldMetaValueChange[]).filter(change => change.metaKey === metaKey);
        }
        return changes.at(-1);
    }

    getFieldChanges(field: Field, filter?: FieldValueChangeFilter): FieldValueChange[];
    getFieldChanges(field: Field, filter?: FieldMetaValueChangeFilter): FieldMetaValueChange[];
    getFieldChanges(field: Field, filter?: FieldAnyChangeFilter): FieldChange[];
    getFieldChanges(field: Field, { onlyCurrentState = true, last = true, processed = false, type = null }: FieldAnyChangeFilter | FieldValueChangeFilter | FieldMetaValueChangeFilter = {}): FieldChange[] {
        let changes = this._changes.filter(change => change.field === field);
        if (type != null) { changes = changes.filter(change => change.type === type); }
        if (last != null) { changes = changes.filter(change => change.last === last); }
        if (processed != null) { changes = changes.filter(change => change.processed === processed); }
        if (onlyCurrentState) { changes = changes.filter(change => change.stateKey === field.currentStateKey); }
        return changes
    }

    hasChanges(field: Field): boolean {
        return this.getFieldChanges(field, { onlyCurrentState: true, last: true }).length !== 0;
    }

    markProcessed(changes: FieldChange[]): void {
        changes.forEach(change => { change.processed = true; });
        this.trimProcessedChanges();
    }

    static asChangedName(change: FieldChange): string | null {
        if (change.type === FieldChangeType.Value) {
            return change.field.name;
        }
        if (change.type === FieldChangeType.MetaValue) {
            return getMetaDependencyKey(change.field.name, change.metaKey);
        }
        return null;
    }

    static asChangedNames(changes: FieldChange[]): Set<string> {
        const changedNames = new Set<string>();
        for (const change of changes) {
            const changedName = this.asChangedName(change);
            if (changedName == null) continue;
            changedNames.add(changedName);
        }
        return changedNames;
    }

    processChanges(field: Field, type: FieldChangeType | null = null, dryRun: boolean = false): Set<string> {
        const lastChanges = this.getFieldChanges(field, { onlyCurrentState: true, type });
        if (!dryRun) {
            this.markProcessed(this.getFieldChanges(field, { onlyCurrentState: true, last: null, type }));
            field.dispatchEvent(new FieldChangesEvent(lastChanges));
        }
        return ChangeSet.asChangedNames(lastChanges);
    }
}