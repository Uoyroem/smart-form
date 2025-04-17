import { Form } from ".";
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
    disabledIsNull?: boolean;
}

interface FieldSetValueOptions {
    stateKey?: string;
    processChanges?: boolean;
    initiator?: any;
}

interface FieldSetMetaValueOptions {
    stateKey?: string;
    processChanges?: boolean;
    initiator?: any;
}

interface FieldGetMetaValueOptions {
    stateKey?: string;
}

export interface InitialMetaItem {
    value: any;
    resettable: boolean;
}

export class FieldSyncer {

}

export class FieldValueFromElementSyncer {

}



export class Field extends EventTarget {
    private _initializedStateKeys: Set<string>;
    private _initialValue: any;
    private _valueMap: Map<string, any>;
    private _initialMeta: Map<string, InitialMetaItem>;
    private _metaMap: Map<string, Map<string, any>>;
    private _currentStateKey: string;

    constructor(
        public readonly name: string,
        public readonly type: Type,
        public readonly form: Form
    ) {
        super();

        this._initializedStateKeys = new Set();
        this._currentStateKey = "default";

        this._initialValue = null;
        this._initialMeta = new Map();

        this._valueMap = new Map();
        this._metaMap = new Map();

        this.initializeState({ stateKey: "default" });
        this.initializeDependencies();
    }

    /**
     * 
     * @param {EffectManager} effectManager 
     */
    initializeDependencies() {
        this.form.effectManager.addDependency(this.name, getMetaDependencyKey(this.name, "disabled"));
        switch (this.type.asElementType()) {
            case "checkbox":
            case "radio":
                this.form.effectManager.addDependency(this.name, getMetaDependencyKey(this.name, "checked"));
                break;
        }
    }

    addElementSyncer(element: Element) {
        this.form.effectManager.registerNode({
            key: "element",
            value: {
                type: "element-syncer",
                async callback() {
                    (this.type as any).setElementValue(element, )
                    return new Set();
                }
            },
            dependsOn: [this.name]
        })
    }

    get currentStateKey() {
        return this._currentStateKey;
    }

    setInitialValue(newValue: any): void {
        this._initialValue = newValue;
    }

    clearInitialMeta(): void {
        this._initialMeta = new Map();
    }

    setInitialMetaValue(metaKey: string, newValue: any, { resettable = true }: { resettable?: boolean } = {}): void {
        this._initialMeta.set(metaKey, { value: newValue, resettable });
    }

    reset({ stateKey, full = false, processChanges = false, initiator }: FieldResetOptions = {}): Set<string> {
        stateKey = stateKey ?? this._currentStateKey;
        console.log("[Field.reset] Reset state `%s` for field `%s`", stateKey, this.name);
        if (full) {
            this._metaMap.set(stateKey, new Map());
        }
        for (const [metaKey, item] of this._initialMeta.entries()) {
            if (!full && !item.resettable) continue;
            this.setMetaValue(metaKey, item.value, { stateKey, initiator });
        }
        this.setValue(this._initialValue, { stateKey, initiator });
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
                this.form.changeSet.add(change);
            }
        }
        const oldValue = this._valueMap.get(this._currentStateKey);
        const newValue = this._valueMap.get(stateKey);
        if (!this.type.isValuesEqual(oldValue, newValue)) {
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
            this.form.changeSet.add(change);
        }
        this._currentStateKey = stateKey;
        return this.processChanges(null, !processChanges);
    }

    getValue({ stateKey }: FieldGetValueOptions = {}): any {
        stateKey ??= this._currentStateKey
        this.initializeState({ stateKey });
        return this._valueMap.get(stateKey);
    }

    setValue(newValue: any, { stateKey, initiator, processChanges = false }: FieldSetValueOptions = {}): Set<string> {
        initiator ??= this;
        stateKey ??= this._currentStateKey;
        this.initializeState({ stateKey, initiator });
        const oldValue = this.getValue({ stateKey });
        if (this.type.isValuesEqual(oldValue, newValue)) return new Set();
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
        this.form.changeSet.add(change);
        return this.processChanges(FieldChangeType.Value, !processChanges);
    }

    getMetaValue(metaKey: string, { stateKey }: FieldGetMetaValueOptions = {}): any {
        stateKey ??= this._currentStateKey
        this.initializeState({ stateKey });
        const meta = this._metaMap.get(stateKey);
        return meta!.get(metaKey);
    }

    setMetaValue(metaKey: string, newValue: any, { stateKey, initiator, processChanges = false }: FieldSetMetaValueOptions = {}): Set<string> {
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
        this.form.changeSet.add(change);
        console.log("[Field.setMetaValue] Meta", getMetaDependencyKey(this.name, metaKey), "value changed:", { oldValue, newValue, stateKey });
        return this.processChanges(FieldChangeType.MetaValue, !processChanges);
    }

    processChanges(type: FieldChangeType | null = null, dryRun: boolean = false): Set<string> {
        return this.form.changeSet.processChanges(this, type, dryRun);
    }
}
