import { ChangeSet } from "./change-set";
import { EffectManager } from "./effect-manager";
import { Type } from "./type";
import { deepEqual, getMetaDependencyKey } from "./utils";

export enum FieldChangeType {
    Value = "value",
    MetaValue = "meta-value"
}

export interface FieldValueChange {
    stateKey: string;
    type: FieldChangeType.Value;
    field: Field;
    oldValue: any;
    newValue: any;
    initiator: any;
    processed: boolean;
    last: boolean;
    date: Date;
}

export interface FieldMetaValueChange {
    stateKey: string;
    type: FieldChangeType.MetaValue;
    field: Field;
    metaKey: string;
    oldValue: any;
    newValue: any;
    initiator: any;
    processed: boolean;
    last: boolean;
    date: Date;
}

export type FieldChange = FieldValueChange | FieldMetaValueChange;



interface FieldResetOptions {
    stateKey?: string;
    full?: boolean;
    processChanges?: boolean;
    initiator?: any;
}

interface FieldInitializeStateOptions {
    stateKey: string;
    initiator?: any;
}

interface FieldSwitchStateOptions {
    stateKey: string;
    initiator?: any;
    processChanges?: boolean;
}

interface FieldGetValueOptions {
    stateKey?: string;
    raw?: boolean;
    disabledIsNull?: boolean;
}

interface FieldSetValueOptions {
    stateKey?: string;
    raw?: boolean;
    processChanges?: boolean;
    initiator?: any;
}
interface FieldSetMetaValueOptions {
    stateKey?: string;
    raw?: boolean;
    processChanges?: boolean;
    initiator?: any;
}

interface FieldGetMetaValueOptions {
    stateKey?: string;
    raw?: boolean;
}

export interface FieldContext {
    raw?: boolean;
    processChanges?: boolean;
    stateKey?: string;
    initiator?: any;
    disabledIsNull?: boolean;
}

export interface InitialMetaItem {
    value: any;
    resettable: boolean;
}


export class Field extends EventTarget {
    private _changeSet: ChangeSet;
    private _initializedStateKeys: Set<string>;
    private _initialValue: any;
    private _valueMap: Map<string, any>;
    private _initialMeta: Map<string, InitialMetaItem>;
    private _metaMap: Map<string, Map<string, any>>;
    private _currentStateKey: string;

    constructor(
        public readonly name: string,
        public readonly type: Type,
        {
            changeSet = null,
            effectManager = null
        }: { changeSet?: ChangeSet | null, effectManager?: EffectManager | null } = {}
    ) {
        super();
        this._initializedStateKeys = new Set();

        this._initialValue = null;
        this._valueMap = new Map();

        this._initialMeta = new Map();
        this._metaMap = new Map();

        this._changeSet = changeSet ?? new ChangeSet(32);
        this._currentStateKey = "default";
        this.initializeState({ stateKey: "default" });
        if (effectManager != null) {
            this.initializeDependencies(effectManager);
        }
    }

    /**
     * 
     * @param {EffectManager} effectManager 
     */
    initializeDependencies(effectManager: EffectManager) {
        effectManager.addDependency(this.name, getMetaDependencyKey(this.name, "disabled"));
        switch (this.type.asElementType()) {
            case "checkbox":
            case "radio":
                effectManager.addDependency(this.name, getMetaDependencyKey(this.name, "checked"));
                break;
        }
    }

    get currentStateKey() {
        return this._currentStateKey;
    }

    get changeSet(): ChangeSet {
        return this._changeSet;
    }

    clearInitialMeta(): void {
        this._initialMeta = new Map();
    }

    reset({ stateKey, full = false, processChanges = false, initiator }: FieldResetOptions = {}): Set<string> {
        stateKey = stateKey ?? this._currentStateKey;
        console.log("[Field.reset] Reset state `%s` for field `%s`", stateKey, this.name);
        if (full) {
            this._metaMap.set(stateKey, new Map());
        }
        for (const [metaKey, item] of this._initialMeta.entries()) {
            if (!full && !item.resettable) continue;
            this.setMetaValue(metaKey, item.value, { raw: true, stateKey, initiator });
        }
        this.setValue(this._initialValue, { raw: true, stateKey, initiator });
        return this.processChanges(null, !processChanges);
    }

    initializeState({ stateKey, initiator }: FieldInitializeStateOptions): void {
        if (!this._initializedStateKeys.has(stateKey)) {
            console.log("[Field.initializeState] Initializing state key `%s` for field `%s`", stateKey, this.name);
            this._initializedStateKeys.add(stateKey);
            this.reset({ stateKey, initiator, processChanges: true, full: true });
        }
    }

    switchState({ stateKey, initiator, processChanges = false }: FieldSwitchStateOptions): Set<string> {
        console.log("[Field.switchState] Switching state for field `%s` from `%s` to `%s`", this.name, this._currentStateKey, stateKey);
        this.initializeState({ stateKey, initiator });
        for (const [metaKey, newValue] of this._metaMap.get(stateKey)!.entries()) {
            const oldValue = this._metaMap.get(this._currentStateKey)!.get(metaKey);
            if (!deepEqual(oldValue, newValue)) {
                console.log("[Field.switchState] Field meta value %s has change between stages", getMetaDependencyKey(this.name, metaKey));
                const change: FieldChange = {
                    stateKey,
                    type: FieldChangeType.MetaValue,
                    field: this,
                    initiator,
                    metaKey,
                    oldValue,
                    newValue,
                    date: new Date(),
                    last: true,
                    processed: false
                };
                this.changeSet.add(change);
            }
        }
        const oldValue = this._valueMap.get(this._currentStateKey);
        const newValue = this._valueMap.get(stateKey);
        if (!this.type.isEqual(oldValue, newValue)) {
            console.log("[Field.switchState] Field value %s has change between stages", this.name)
            const change: FieldChange = {
                stateKey,
                type: FieldChangeType.Value,
                field: this,
                initiator,
                oldValue,
                newValue,
                date: new Date(),
                last: true,
                processed: false
            };
            this.changeSet.add(change);
        }
        this._currentStateKey = stateKey;
        return this.processChanges(null, !processChanges);
    }

    getValue({ stateKey, raw = false, disabledIsNull = true }: FieldGetValueOptions = {}): any {
        if (!raw) {
            if (disabledIsNull && this.getMetaValue("disabled", { stateKey })) {
                return null;
            }
            // return this.type.getFieldValue(this.withContext({ stateKey, raw: true }));
        }

        stateKey ??= this._currentStateKey
        this.initializeState({ stateKey });
        return this._valueMap.get(stateKey);
    }

    setInitialValue(newValue: any): void {
        this._initialValue = newValue;
    }

    setValue(newValue: any, { stateKey, raw = false, initiator, processChanges = false }: FieldSetValueOptions = {}): Set<string> {
        if (!raw) {
            // return this.type.setFieldValue(this.getAdapter({ stateKey, raw: true, processChanges, initiator }), newValue);
        }
        initiator ??= this;
        stateKey ??= this._currentStateKey;
        this.initializeState({ stateKey, initiator });
        const oldValue = this.getValue({ stateKey, raw: true });
        if (this.type.isEqual(oldValue, newValue)) return new Set();
        this._valueMap.set(stateKey, newValue);
        const change: FieldChange = {
            stateKey,
            type: FieldChangeType.Value,
            field: this,
            initiator,
            oldValue,
            newValue,
            date: new Date(),
            last: true,
            processed: false
        };
        console.log("[Field.setValue] Value changed:", { oldValue, newValue, stateKey });
        this.changeSet.add(change);
        return this.processChanges(FieldChangeType.Value, !processChanges);
    }

    getMetaValue(metaKey: string, { stateKey, raw = false }: FieldGetMetaValueOptions = {}): any {
        if (!raw) {
            // return this.type.getFieldMetaValue(this.getAdapter({ raw: true, stateKey }), metaKey);
        }
        stateKey ??= this._currentStateKey
        this.initializeState({ stateKey });
        const meta = this._metaMap.get(stateKey);
        return meta!.get(metaKey);
    }

    setInitialMetaValue(metaKey: string, newValue: any, { resettable = true }: { resettable?: boolean } = {}): void {
        this._initialMeta.set(metaKey, { value: newValue, resettable });
    }

    setMetaValue(metaKey: string, newValue: any, { stateKey, initiator, processChanges = false, raw = false }: FieldSetMetaValueOptions = {}): Set<string> {
        if (!raw) {
            // return this.type.setFieldMetaValue({} as any, metaKey, newValue);
        }
        initiator ??= this;
        stateKey ??= this._currentStateKey;
        this.initializeState({ stateKey, initiator });
        const oldValue = this.getMetaValue(metaKey, { stateKey });
        if (oldValue === newValue) return new Set();
        this._metaMap.get(stateKey)!.set(metaKey, newValue);
        const change: FieldChange = {
            stateKey,
            type: FieldChangeType.MetaValue,
            field: this,
            initiator,
            metaKey,
            oldValue,
            newValue,
            date: new Date(),
            last: true,
            processed: false
        };
        this.changeSet.add(change);
        console.log("[Field.setMetaValue] Meta", getMetaDependencyKey(this.name, metaKey), "value changed:", { oldValue, newValue, stateKey });
        return this.processChanges(FieldChangeType.MetaValue, !processChanges);
    }

    processChanges(type: FieldChangeType | null = null, dryRun: boolean = false): Set<string> {
        return this.changeSet.processChanges(this, type, dryRun);
    }
}