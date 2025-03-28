export namespace Uoyroem {
    function deepEqual(a: any, b: any): boolean {
        if (a === b) return true;

        if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
            return false;
        }

        const aKeys = new Set(Object.keys(a));
        const bKeys = new Set(Object.keys(b));

        if (aKeys.size !== bKeys.size) return false;
        for (const key of aKeys) {
            if (!deepEqual(a[key], b[key])) {
                return false;
            }
        }

        return true;
    }

    export function getMetaDependencyKey(fieldName: string, metaKey: string) {
        return `${fieldName}.${metaKey}`;
    }

    export interface Effect {
        type: string;
        callback: () => Promise<Set<string>> | Set<string>;
        dependsOn: string[];
    }

    export class EffectManager {
        private _nameEffect: Map<string, Effect> = new Map();
        private _names: Set<string> = new Set();
        private _dependentMap: Map<string, Set<string>> = new Map();
        private _dependencyMap: Map<string, Set<string>> = new Map();
        private _addedDependencies: string[][] = [];
        private _topologicalOrder: string[];

        constructor() {
            this._nameEffect = new Map();
            this._names = new Set();
            this._dependentMap = new Map();
            this._dependencyMap = new Map();
            this._addedDependencies = [];
            this._topologicalOrder = [];
        }

        buildDependenciesMap() {
            this._dependentMap = new Map();
            this._dependencyMap = new Map();
            this._names = new Set();
            this._topologicalOrder = [];

            const dependencies: string[][] = [];
            for (const [name, effect] of this._nameEffect) {
                for (const dependency of effect.dependsOn) {
                    dependencies.push([name, dependency])
                }
            }
            dependencies.push(...this._addedDependencies)

            for (const [dependent, dependency] of dependencies) {
                this._names.add(dependent);
                this._names.add(dependency);
                if (!this._dependentMap.has(dependent)) {
                    this._dependentMap.set(dependent, new Set());
                }
                if (!this._dependentMap.has(dependency)) {
                    this._dependentMap.set(dependency, new Set());
                }
                if (!this._dependencyMap.has(dependent)) {
                    this._dependencyMap.set(dependent, new Set());
                }
                if (!this._dependencyMap.has(dependency)) {
                    this._dependencyMap.set(dependency, new Set());
                }
                this._dependentMap.get(dependent)!.add(dependency);
                this._dependencyMap.get(dependency)!.add(dependent);
            }
            const inDegree = new Map();
            for (const [dependent, dependencies] of this._dependentMap) {
                inDegree.set(dependent, dependencies.size);
            }
            const queue: string[] = [];
            for (const [dependent, degree] of inDegree) {
                if (degree === 0) {
                    queue.push(dependent);
                }
            }
            while (queue.length > 0) {
                const name = queue.shift()!;
                this._topologicalOrder.push(name);
                for (const dependency of this._dependencyMap.get(name)!) {
                    inDegree.set(dependency, inDegree.get(dependency) - 1);
                    if (inDegree.get(dependency) === 0) {
                        queue.push(dependency);
                    }
                }
            }
            if (this._topologicalOrder.length !== this._names.size) {
                console.error("There are cyclic dependencies.");
            } else {
                console.log("Dependency map successfully built.")
                console.log(this._topologicalOrder);
            }
        }

        addDependency(dependent: string, dependency: string) {
            this._addedDependencies.push([dependent, dependency]);
        }

        addEffect(name: string, effect: Effect) {
            this._nameEffect.set(name, effect)
        }

        async triggerEffects({ changedNames = null }: { changedNames?: Set<string> | null } = {}) {
            if (changedNames == null) {
                console.group("Triggering all effects");
            } else {
                console.group("Triggering effects for changed names: ", changedNames)
            }

            for (const name of this._topologicalOrder) {
                if (changedNames != null && this._dependentMap.get(name)!.intersection(changedNames).size === 0) {
                    continue;
                }
                console.group("Triggering effect: ", name);
                const effect = this._nameEffect.get(name);
                if (effect != null) {
                    const changedNamesByEffect = await effect.callback();
                    if (changedNames) {
                        changedNamesByEffect.forEach(changedName => { changedNames.add(changedName); });
                    }
                } else {
                    if (changedNames) {
                        changedNames.add(name);
                        console.log("There were changes");
                    }
                }
                console.groupEnd();
            }
            console.groupEnd();
        }
    }


    export class FormFieldValidator {
        public name: string;

        constructor(name: string) {
            this.name = name;
        }

        validate(field: FormField) {

        }
    }

    export type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    export class FormFieldType {
        static nullable() {
            return class extends this {
                private _nullable: boolean;

                constructor(name: string) {
                    super(name);
                    this._nullable = false;
                }

                nullable(value = true) {
                    this._nullable = value;
                    return this;
                }
            };
        }

        static object({ nullable = false } = {}) {
            return new FormFieldTypeObject().nullable(nullable);
        }

        static text({ nullable = false } = {}) {
            return new FormFieldTypeText().nullable(nullable);
        }

        static number({ nullable = false } = {}) {
            return new FormFieldTypeNumber().nullable(nullable);
        }

        static date({ nullable = false } = {}) {
            return new FormFieldTypeDate().nullable(nullable);
        }

        static select({ multiple = false, nullable = false } = {}) {
            return new FormFieldTypeSelect().multiple(multiple).nullable(nullable);
        }

        static checkbox() {
            return new FormFieldTypeCheckbox();
        }

        static radio() {
            return new FormFieldTypeRadio();
        }

        static isFormElement(element: Element): element is FormElement {
            return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
        }

        static fromFormElement(element: FormElement): FormFieldType {
            switch (element.type) {
                case "select-one":
                    return this.select();
                case "select-multiple":
                    return this.select().multiple();
                case "number":
                    return this.number();
                case "text":
                    return this.text();
                case "textarea":
                    return this.text().area();
                case "checkbox":
                    return this.checkbox();
                case "radio":
                    return this.radio();
                case "date":
                    return this.date();
                default:
                    throw new Error(`As element type ${element} not has`);
            }
        }

        public name: string;

        constructor(name: string) {
            this.name = name;
        }

        isEqual(a: any, b: any): boolean { return a === b; }
        isEmpty() { }
        asElementType() { return "hidden"; }

        getFieldValue(field: FormField) {
            return field.getValue();
        }

        setFieldValue(field: FormField, newValue: any): Set<string> {
            return field.setValue(newValue);
        }

        initializeValue(setValue: (value: any) => void): void {
            setValue(null);
        }

        initializeMeta(setMetaValue: (metaKey: string, value: any) => void): void {
            setMetaValue("disabled", false);
            setMetaValue("dirty", false);
        }

        isSameType(otherType: FormFieldType): boolean {
            return this.name === otherType.name;
        }
    }

    export class FormFieldTypeText extends FormFieldType.nullable() {
        private _area: boolean;

        constructor() {
            super("String");
            this._area = false;
        }

        area(value = true): this {
            this._area = value;
            return this;
        }

        asElementType(): string {
            return this._area ? "textarea" : "text";
        }
    }

    export class FormFieldTypeNumber extends FormFieldType.nullable() {
        constructor() {
            super("Number");
        }

        asElementType(): string {
            return "number";
        }
    }

    export class FormFieldTypeDate extends FormFieldType.nullable() {
        constructor() {
            super("Date");
        }

        asElementType(): string {
            return "date";
        }

        isEqual(a: any, b: any): boolean {
            return a.toDateString() === b.toDateString();
        }
    }

    export class FormFieldTypeRadio extends FormFieldType {
        constructor() {
            super("Radio");
        }

        asElementType(): string {
            return "radio";
        }

        initializeMeta(setMetaValue: (metaKey: string, value: any) => void): void {
            super.initializeMeta(setMetaValue);
            setMetaValue("checked", true);
        }

        getFieldValue(field: FormField): any {
            return field.getMetaValue("checked") ? field.getValue() : null;
        }

        setFieldValue(field: FormField, newValue: any): any {
            return field.setMetaValue("checked", newValue != null && newValue === field.getValue());
        }
    }

    export class FormFieldTypeCheckbox extends FormFieldType {
        constructor() {
            super("Checkbox");
        }

        asElementType(): string {
            return "checkbox";
        }

        initializeMeta(setMetaValue: (metaKey: string, value: any) => void): void {
            super.initializeMeta(setMetaValue);
            setMetaValue("checked", true);
        }

        getFieldValue(field: FormField): any {
            const value = field.getValue();
            if (["", "on"].includes(value)) return field.getMetaValue("checked");
            return field.getMetaValue("checked") ? value : null;
        }

        setFieldValue(field: FormField, newValue: any): any {
            if (["", "on"].includes(field.getValue())) return field.setMetaValue("checked", newValue);
            return field.setValue(newValue);
        }
    }

    export class FormFieldTypeSelect extends FormFieldType.nullable() {
        private _multiple: boolean;
        private _of: FormFieldType;

        constructor() {
            super("select");
            this._multiple = false;
            /**
             * @type {FormFieldType}
             */
            this._of = FormFieldType.text();
        }

        asElementType(): string {
            return this._multiple ? "select-multiple" : "select-one";
        }

        initializeMeta(setMetaValue: (metaKey: string, value: any) => void): void {
            super.initializeMeta(setMetaValue);
            setMetaValue("optionsInitialized", false);
        }

        multiple(value: boolean = true): this {
            this._multiple = value;
            return this;
        }

        of(type: FormFieldType): this {
            this._of = type;
            return this;
        }
    }

    export class FormFieldTypeObject extends FormFieldType.nullable() {
        constructor() {
            super("Object");
        }

        isEqual(a: any, b: any): boolean {
            return deepEqual(a, b);
        }
    }

    export enum ChangeType {
        VALUE = "value",
        METAVALUE = "metavalue"
    }

    export interface ValueChange {
        stateKey: string;
        type: ChangeType.VALUE;
        field: FormField;
        oldValue: any;
        newValue: any;
        initiator: any;
        processed: boolean;
        last: boolean;
        date: Date;
    }

    export interface MetaValueChange {
        stateKey: string;
        type: ChangeType.METAVALUE;
        field: FormField;
        metaKey: string;
        oldValue: any;
        newValue: any;
        initiator: any;
        processed: boolean;
        last: boolean;
        date: Date;
    }

    export type Change = ValueChange | MetaValueChange;

    export class ChangesEvent extends Event {
        constructor(public changes: Change[]) {
            super("changes", { cancelable: true });
        }
    }

    export class FormFieldChangeSet {
        private _changes: Change[];
        private _maxSize: number;

        constructor(maxSize = 128) {
            this._changes = [];
            this._maxSize = maxSize;
        }

        add(change: Change): void {
            this._changes.push(change);
            console.log("[FieldChangeSet] Change", change, "added");
            if (this._changes.length > this._maxSize) {
                const index = this._changes.findIndex(c => c.processed);
                if (index !== -1) {
                    this._changes.splice(index, 1);
                }
            }
        }

        remove(change: Change): void {
            this._changes.splice(this._changes.indexOf(change), 1);
        }

        findLast(filter: (change: Change) => boolean): Change | undefined {
            return this._changes.find(change => change.last && filter(change));
        }

        getFieldChanges(field: FormField): Change[] {
            return this._changes.filter(change => !change.processed && change.field === field);
        }

        getLastFieldChanges(field: FormField): Change[] {
            return this._changes.filter(change => !change.processed && change.last && change.field === field);
        }

        hasChanges(field: FormField): boolean {
            return this.getLastFieldChanges(field).length !== 0;
        }

        markProcessed(changes: Change[]): void {
            changes.forEach(change => { change.processed = true; })
        }

        static asChangedName(change: Change): string | null {
            if (change.type === "value") {
                return change.field.name;
            }
            if (change.type === "metavalue") {
                return getMetaDependencyKey(change.field.name, change.metaKey);
            }
            return null;
        }

        static asChangedNames(changes: Change[]): Set<string> {
            const changedNames = new Set<string>();
            for (const change of changes) {
                const changedName = this.asChangedName(change);
                if (changedName == null) continue;
                changedNames.add(changedName);
            }
            return changedNames;
        }

        processChanges(field: FormField): Set<string> {
            const changes = this.getFieldChanges(field);
            const lastChanges = this.getLastFieldChanges(field);
            this.markProcessed(changes);
            field.dispatchEvent(new ChangesEvent(changes));
            return FormFieldChangeSet.asChangedNames(lastChanges);
        }
    }

    export class FormField extends EventTarget {
        public name: string;
        public type: FormFieldType;
        public changeSet: FormFieldChangeSet;
        private _initializedStateKeys: Set<string>;
        private _initialValue: any;
        private _valueMap: Map<string, any>;
        private _initialMeta: Map<string, any>;
        private _metaMap: Map<string, Map<string, any>>;
        private _currentStateKey: string;

        constructor(name: string, type: FormFieldType, { changeSet = null, effectManager = null }: { changeSet?: FormFieldChangeSet | null, effectManager?: any } = {}) {
            super();
            this.name = name;
            this.type = type;
            this._initializedStateKeys = new Set();
            this._currentStateKey = "default";

            this._initialValue = null;
            this.initialValue(setValue => type.initializeValue(setValue));
            this._valueMap = new Map();

            this._initialMeta = new Map();
            this.initialMeta(setMetaValue => type.initializeMeta(setMetaValue), false);
            this._metaMap = new Map();

            this.changeSet = changeSet ?? new FormFieldChangeSet(32);

            this.switchState("default");
            if (effectManager != null) {
                this.initializeDependencies(effectManager);
            }
        }

        initialValue(callback: (setValue: (value: any) => void) => void) {
            callback(value => {
                this._initialValue = value;
            });
        }

        initialMeta(callback: (setValue: (metaKey: string, value: any) => void) => void, clear = false) {
            if (clear) {
                this._initialMeta = new Map();
            }

            callback((metaKey, value) => {
                this._initialMeta.set(metaKey, value);
            });
        }

        reset({ stateKey = null, initiator = null }: { stateKey?: string | null, initiator?: any } = {}) {
            stateKey ??= this._currentStateKey;

            this._valueMap.set(stateKey, null);
            this._metaMap.set(stateKey, new Map());
            this.setValue(this._initialValue, { stateKey, initiator, typed: false });
            for (const [metaKey, value] of this._initialMeta.entries()) {
                this.setMetaValue(metaKey, value, { stateKey, initiator });
            }
            return this.processChanges();
        }

        switchState(stateKey: string) {
            if (!this._initializedStateKeys.has(stateKey)) {
                this._initializedStateKeys.add(stateKey);
                this.reset({ stateKey });
            }
            this._currentStateKey = stateKey;
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

        getAdapter({ stateKey = null, initiator = null, disabledIsNull = true, typed = true }: { stateKey?: string | null, initiator?: any, disabledIsNull?: boolean, typed?: boolean } = {}) {
            const context = { stateKey, initiator, typed, disabledIsNull };
            return new Proxy(this, {
                get(target, propertyKey, receiver) {
                    switch (propertyKey) {
                        case "getValue":
                            return ({ stateKey = context.stateKey, typed = context.typed, disabledIsNull = context.disabledIsNull } = {}) => target.getValue({ typed, stateKey, disabledIsNull });
                        case "getMetaValue":
                            return (metaKey: string, { stateKey = context.stateKey } = {}) => target.getMetaValue(metaKey, { stateKey });
                        case "setValue":
                            return (newValue: any, { stateKey = context.stateKey, typed = context.typed, initiator = context.initiator, processChanges = false } = {}) => target.setValue(newValue, { stateKey, typed, initiator, processChanges });
                        case "setMetaValue":
                            return (metaKey: string, newValue: any, { stateKey = context.stateKey, initiator = context.initiator, processChanges = false } = {}) => target.setMetaValue(metaKey, newValue, { stateKey, initiator, processChanges });
                        default:
                            const value = Reflect.get(target, propertyKey, receiver);
                            return typeof value === "function" ? value.bind(target) : value;
                    }
                }
            });
        }

        getValue({ stateKey = null, typed = true, disabledIsNull = true }: { stateKey?: string | null, typed?: boolean, disabledIsNull?: boolean } = {}): any {
            if (disabledIsNull && this.getMetaValue("disabled", { stateKey })) {
                return null;
            }
            if (typed) {
                return this.type.getFieldValue(this.getAdapter({ stateKey, disabledIsNull: false, typed: false }));
            }
            return this._valueMap.get(stateKey ?? this._currentStateKey);
        }

        setValue(newValue: any, { stateKey = null, typed = true, initiator = null, processChanges = false }: { stateKey?: string | null, typed?: boolean, initiator?: any, processChanges?: boolean } = {}): Set<string> {
            initiator ??= this;
            stateKey ??= this._currentStateKey;
            if (typed) {
                return this.type.setFieldValue(this.getAdapter({ stateKey, disabledIsNull: false, typed: false, initiator }), newValue);
            }
            const oldValue = this.getValue({ stateKey, typed: false });
            if (this.type.isEqual(oldValue, newValue)) return new Set();
            this._valueMap.set(stateKey, newValue);
            const lastChange = this.changeSet.findLast(change => change.type === "value");
            if (lastChange) {
                lastChange.last = false;
            }
            const change: Change = {
                stateKey,
                type: ChangeType.VALUE,
                field: this,
                initiator,
                oldValue,
                newValue,
                date: new Date(),
                last: true,
                processed: false
            };
            this.changeSet.add(change);
            return processChanges ? this.processChanges() : FormFieldChangeSet.asChangedNames([change]);
        }

        getMetaValue<T = any>(metaKey: string, { stateKey = null }: { stateKey?: string | null } = {}): T | null {
            stateKey ??= this._currentStateKey
            if (!this._metaMap.has(stateKey)) return null;
            const meta = this._metaMap.get(stateKey);
            return meta!.get(metaKey);
        }

        setMetaValue(metaKey: string, newValue: any, { stateKey = null, initiator = null, processChanges = false }: { stateKey?: string | null, initiator?: any, processChanges?: boolean } = {}): Set<string> {
            initiator ??= this;
            stateKey ??= this._currentStateKey;
            if (!this._metaMap.has(stateKey)) return new Set();
            const oldValue = this.getMetaValue(metaKey, { stateKey });
            if (oldValue === newValue) return new Set();
            this._metaMap.get(stateKey)!.set(metaKey, newValue);
            const lastChange = this.changeSet.findLast(change => change.type === "metavalue" && change.metaKey === metaKey);
            if (lastChange != null) {
                lastChange.last = false;
            }
            initiator ??= this;
            const change: Change = {
                stateKey,
                type: ChangeType.METAVALUE,
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
            return processChanges ? this.processChanges() : FormFieldChangeSet.asChangedNames([change]);
        }

        processChanges(): Set<string> {
            return this.changeSet.processChanges(this);
        }
    }

    export class FormFieldList {
        constructor(public fields: FormField[]) { }

        getAdapter({ stateKey = null, initiator = null, disabledIsNull = true, typed = true }: { stateKey?: string | null, typed?: boolean, initiator?: any, disabledIsNull?: boolean } = {}) {
            const context = { stateKey, initiator, typed, disabledIsNull };
            return new Proxy(this, {
                get(target, propertyKey, receiver) {
                    switch (propertyKey) {
                        case "getValue":
                            return ({ stateKey = context.stateKey, typed = context.typed, disabledIsNull = context.disabledIsNull } = {}) => target.getValue({ typed, stateKey, disabledIsNull });
                        case "getMetaValue":
                            return (metaKey: string, { stateKey = context.stateKey } = {}) => target.getMetaValue(metaKey, { stateKey })
                        case "setValue":
                            return (newValue: any, { stateKey = context.stateKey, typed = context.typed, initiator = context.initiator, processChanges = false } = {}) => target.setValue(newValue, { stateKey, typed, initiator, processChanges })
                        case "setMetaValue":
                            return (metaKey: string, newValue: any, { stateKey = context.stateKey, initiator = context.initiator, processChanges = false } = {}) => target.setMetaValue(metaKey, newValue, { stateKey, initiator, processChanges })
                        default:
                            const value = Reflect.get(target, propertyKey, receiver);
                            return typeof value === "function" ? value.bind(target) : value;
                    }
                }
            });
        }

        getValue({ stateKey = null, disabledIsNull = true, typed = true }: { stateKey?: string | null, disabledIsNull?: boolean, typed?: boolean } = {}): any {
            return this.fields.map(field => field.getValue({ stateKey, disabledIsNull, typed })).find(value => value != null);
        }

        getMetaValue(metaKey: string, { stateKey = null }: { stateKey?: string | null } = {}): any {
            return this.fields.map(field => field.getMetaValue(metaKey, { stateKey })).find(value => value != null);
        }

        setValue(value: any, { stateKey = null, typed = true, initiator = null, processChanges = false }: { stateKey?: string | null, typed?: boolean, initiator?: any, processChanges?: boolean } = {}): Set<string> {
            return this.fields.map(field => field.setValue(value, { stateKey, typed, initiator, processChanges })).find(changedNames => changedNames.size !== 0) ?? new Set();
        }

        setMetaValue(metaKey: string, value: any, { stateKey = null, initiator = null, processChanges = false }: { stateKey?: string | null, initiator?: any, processChanges?: boolean } = {}): Set<string> {
            return this.fields.map(field => field.setMetaValue(metaKey, value, { stateKey, initiator, processChanges })).find(changedNames => changedNames.size !== 0) ?? new Set();
        }

        processChanges(): Set<string> {
            return this.fields.map(field => field.processChanges()).find(changedNames => changedNames.size !== 0) ?? new Set();
        }
    }

    export abstract class FormFieldLinker {
        public field: FormField;
        public type: FormFieldType;

        constructor(field: FormField) {
            this.field = field;
            this.type = field.type;
        }

        abstract link(): void;
        abstract unlink(): void;
    }

    export class FormFieldElementLinker extends FormFieldLinker {
        public element: FormElement;
        private _mutationObserver: MutationObserver;
        /**
         * 
         * @param {FormField} field 
         * @param {Element} element 
         */
        constructor(field: FormField, element: FormElement) {
            super(field);
            this.element = element;
            if (this.type.asElementType() !== this.element.type) {
                throw new Error("For link type is equal")
            }
            this._fieldChangesEventListener = this._fieldChangesEventListener.bind(this);
            this._elementValueInputEventListener = this._elementValueInputEventListener.bind(this);
            this._elementValueChangeEventListener = this._elementValueChangeEventListener.bind(this);
            this._mutationObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "attributes") {
                        switch (mutation.attributeName) {
                            case "disabled":
                                this.field.setMetaValue("disabled", this.element.disabled);
                                break;
                        }
                    }
                }
            });
        }

        link(): void {
            this.field.initialValue(setValue => {
                setValue(this._getElementValue());
            });
            this.field.initialMeta(setMetaValue => {
                setMetaValue("disabled", this._getElementMetaValue("disabled"));
                if (["radio", "checkbox"].includes(this.type.asElementType())) {
                    setMetaValue("checked", this._getElementMetaValue("checked"));
                }
            });
            this.field.reset();
            this.field.addEventListener("changes", this._fieldChangesEventListener);

            if (["text", "number", "textarea"].includes(this.type.asElementType())) {
                this.element.addEventListener("input", this._elementValueInputEventListener);
            } else {
                this.element.addEventListener("change", this._elementValueChangeEventListener);
            }

            this._mutationObserver.observe(this.element, {
                attributes: true,
                attributeFilter: ["disabled"]
            });
        }

        unlink(): void {
            this.field.removeEventListener("changes", this._fieldChangesEventListener);
            if (["text", "number", "textarea"].includes(this.type.asElementType())) {
                this.element.removeEventListener("input", this._elementValueInputEventListener);
            } else {
                this.element.removeEventListener("change", this._elementValueChangeEventListener);
            }
            this._mutationObserver.disconnect();
        }

        _elementValueInputEventListener(event: Event): void {
            this.field.setMetaValue("dirty", true, { initiator: this, processChanges: true });
            this._syncFieldValue();
        }

        _elementValueChangeEventListener(event: Event): void {
            this.field.setMetaValue("dirty", true, { initiator: this, processChanges: true });
            if (["radio", "checkbox"].includes(this.type.asElementType())) {
                this._syncFieldMeta("checked");
            } else {
                this._syncFieldValue();
            }
        }

        _fieldChangesEventListener(event: Event) {
            const changes = (event as ChangesEvent).changes.filter(change => change.initiator !== this);
            for (const change of changes) {
                if (change.type === ChangeType.VALUE) {
                    if (!this._syncElementValue()) {
                        this._syncFieldValue();
                    }
                } else if (change.type === ChangeType.METAVALUE) {
                    this._syncElementMeta(change.metaKey);
                }
            }
        }

        _syncElementValue(): boolean {
            const value = this.field.getValue({ typed: false, disabledIsNull: false });
            const optionsInitialized = this.field.getMetaValue<boolean>("optionsInitialized");
            switch (this.type.asElementType()) {
                case "select-multiple":
                    if (!optionsInitialized) {
                        console.log("PENDING OPTIONS INITIALIZE", value);
                        return true;
                    }
                    const options = (value as any[]).map((value: any) => {
                        return this.element.querySelector<HTMLOptionElement>(`option[value="${value}"]`);
                    });
                    if (options.some(option => option == null)) {
                        return false;
                    }
                    options.forEach(option => { option!.selected = true; });
                    return true;
                case "select-one":
                    if (!optionsInitialized) {
                        console.log("PENDING OPTIONS INITIALIZE", value);
                        return true;
                    }
                    const option = this.element.querySelector<HTMLOptionElement>(`option[value="${value}"]`);
                    if (option == null) return false;
                    option.selected = true;
                    return true;
            }
            this.element.value = value;
            return true;
        }

        _getElementValue(): string {
            return this.element.value;
        }

        _syncFieldValue(): void {
            this.field.setValue(this._getElementValue(), { typed: false, initiator: this, processChanges: true });
        }

        _syncElementMeta(metaKey: string): void {
            const value = this.field.getMetaValue(metaKey);
            switch (metaKey) {
                case "disabled":
                    this.element.disabled = !!value;
                    break;
                case "checked":
                    (this.element as HTMLInputElement).checked = !!value;
                    break;
                case "visible":
                    const container = this.element.parentElement;
                    if (container != null) {
                        if (value) {
                            container.style.display = "";
                            requestAnimationFrame(() => {
                                container.dataset.visible = "true";
                            });
                        } else {
                            container.addEventListener("transitionend", (event) => {
                                container.style.display = "none";
                            }, { once: true });
                            container.dataset.visible = "false";
                        }
                    }
                    break;
                case "autofill":
                    this.element.classList.toggle("autofill", !!value);
                    break;
                case "optionsInitialized":
                    console.log("options initialized", !!value);
                    if (value) {
                        this._syncElementValue();
                    }
                    break;
            }
        }

        _getElementMetaValue(metaKey: string): any {
            switch (metaKey) {
                case "disabled":
                    return this.element.disabled;
                case "checked":
                    return (this.element as HTMLInputElement).checked;
            }
        }

        _syncFieldMeta(metaKey: string): void {
            this.field.setMetaValue(metaKey, this._getElementMetaValue(metaKey), { initiator: this, processChanges: true });
        }
    }

    export class FormFieldsCollection extends EventTarget {
        public list: FormField[];

        constructor() {
            super();
            this.list = [];
            this._fieldChangesEventListener = this._fieldChangesEventListener.bind(this);
        }

        _fieldChangesEventListener(event: Event) {
            const changes = (event as ChangesEvent).changes.filter(change => change.initiator !== this);
            if (changes.length === 0) return;
            for (const change of changes) {
                if (change.type === ChangeType.METAVALUE && change.metaKey === "checked" && change.newValue && change.field.type.asElementType() === "radio") {
                    const field = this.list.find(field => field.name === change.field.name && field !== change.field && field.getMetaValue("checked"));
                    if (field != null) {
                        field.setMetaValue("checked", false, { initiator: this, processChanges: true });
                    }
                }
            }
            this.dispatchEvent(new ChangesEvent(changes));
        }

        add(field: FormField) {
            if (this.list.includes(field)) return false;
            field.addEventListener("changes", this._fieldChangesEventListener);
            this.list.push(field);
            return true;
        }

        get(fieldName: string): FormField | FormFieldList {
            const fields = this.list.filter(field => field.name === fieldName)
            return fields.length === 1 ? fields[0] : new FormFieldList(fields);
        }

        [Symbol.iterator](): Iterator<string> {
            return new Set(this.list.map(field => field.name)).values();
        }
    }

    export interface Option {
        value: string;
        textContent: string;
    }

    export class Form extends EventTarget {
        public form: HTMLFormElement;
        public effectManager: EffectManager;
        public fields: FormFieldsCollection;
        public fieldLinkers: FormFieldLinker[];
        public changeSet: FormFieldChangeSet;

        constructor({ form }: { form: HTMLFormElement }) {
            super();
            this.form = form;
            this.effectManager = new EffectManager();
            this.fields = new FormFieldsCollection();
            this.fieldLinkers = [];
            this.changeSet = new FormFieldChangeSet();
        }

        async setup() {
            if (this.form != null) {
                this.form.classList.add("smart-system-form");
                this.form.noValidate = true;

                this.form.addEventListener("submit", (event) => {
                    event.preventDefault();
                    this.submit().then(() => this.reset());
                });

                this.form.addEventListener("reset", (event) => {
                    event.preventDefault();
                    this.reset();
                });

                this.fields.addEventListener("changes", event => {

                    const changedNames = FormFieldChangeSet.asChangedNames((event as ChangesEvent).changes.filter(change => change.initiator !== this));
                    if (changedNames.size === 0) return;
                    this.effectManager.triggerEffects({ changedNames })
                });

                this.registerElements();
            }
        }

        getFormData(): Record<string, any> {
            const formData: Record<string, any> = {};
            for (const fieldName of this.fields) {
                formData[fieldName] = this.fields.get(fieldName).getValue();
            }
            return formData;
        }

        registerElements(): void {
            for (const element of this.form.elements) {
                if (!FormFieldType.isFormElement(element)) {
                    continue;
                }
                if (element.name === "") continue;
                const field = new FormField(element.name, FormFieldType.fromFormElement(element), { changeSet: this.changeSet, effectManager: this.effectManager });
                const fieldElementLinker = new FormFieldElementLinker(field, element);
                fieldElementLinker.link();
                this.fieldLinkers.push(fieldElementLinker);
                this.fields.add(field);
            }
        }

        getElement(name: string): Element | RadioNodeList | null {
            return this.form.elements.namedItem(name);
        }

        async validate(): Promise<boolean> {
            return true;
        }

        async submit(): Promise<void> {
            if (!await this.validate()) {

            }
        }

        reset(): void {
            for (const field of this.fields.list) {
                field.reset({ initiator: this });
            }
            this.effectManager.triggerEffects();
        }

        addDisableWhenEffect(fieldName: string, disableWhen: () => Promise<boolean> | boolean, dependsOn: string[]): void {
            this.effectManager.addEffect(getMetaDependencyKey(fieldName, "disabled"), {
                type: "disable-when",
                callback: async () => {
                    const disabled = await disableWhen();
                    console.log(`[Effect.DisableWhen] Field ${fieldName} disabled: `, disabled);
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    return field.setMetaValue("disabled", disabled, { processChanges: true });
                },
                dependsOn,
            });
        }

        addVisibleWhenEffect(fieldName: string, visibleWhen: () => Promise<boolean> | boolean, dependsOn: string[]): void {
            this.addDisableWhenEffect(fieldName, async () => !await visibleWhen(), dependsOn);
            this.effectManager.addEffect(getMetaDependencyKey(fieldName, "visible"), {
                type: "visible-when",
                callback: async () => {
                    const visible = await visibleWhen();
                    console.log(`[Effect.VisibleWhen] Field ${fieldName} visible: `, visible);
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    return field.setMetaValue("visible", visible, { processChanges: true });
                },
                dependsOn: [getMetaDependencyKey(fieldName, "disabled")]
            });
        }

        addComputedFieldEffect(fieldName: string, fieldType: FormFieldType, compute: () => Promise<any> | any, dependsOn: string[]): void {
            this.fields.add(new FormField(fieldName, fieldType, { changeSet: this.changeSet, effectManager: this.effectManager }))
            this.effectManager.addEffect(fieldName, {
                type: "computed-field",
                callback: async () => {
                    const value = await compute();
                    console.log(`[Effect.ComputedField] Field ${fieldName} value: `, value);
                    const field = this.fields.get(fieldName);
                    return field.setValue(value, { initiator: this, processChanges: true });
                },
                dependsOn
            });
        }

        addFieldAutofillEffect(fieldName: string, autofillWith: () => Promise<any> | any, dependsOn: string[]): void {
            this.effectManager.addDependency(fieldName, getMetaDependencyKey(fieldName, "autofill"));
            this.effectManager.addEffect(getMetaDependencyKey(fieldName, "autofill"), {
                type: "field-autofill",
                callback: async () => {
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    const dirty = field.getMetaValue("dirty");
                    field.setMetaValue("autofill", !dirty);
                    if (dirty) {
                        return field.processChanges();
                    }
                    const value = await autofillWith();
                    console.log(`[Effect.FieldAutofill] Field ${fieldName} value: `, value);
                    field.setMetaValue("autofill", field.setValue(value).size !== 0);
                    return field.processChanges();
                },
                dependsOn: [getMetaDependencyKey(fieldName, "dirty"), ...dependsOn]
            });
        }

        addSelectOptionsInitializerEffect(fieldName: string, getDefaultOption: () => Promise<Option> | Option, getOptions: () => Promise<Option[]> | Option[], dependsOn: string[]): void {
            this.effectManager.addEffect(fieldName, {
                type: "select-options-initializer",
                callback: async () => {
                    const defaultOption = await getDefaultOption();
                    const options = await getOptions();
                    const selectElement = this.getElement(fieldName) as HTMLSelectElement;
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    const selectedValue = field.getValue({ disabledIsNull: false });
                    field.setValue(defaultOption.value);
                    selectElement.innerHTML = "";
                    for (const option of [defaultOption, ...options]) {
                        const optionElement = document.createElement("option");
                        optionElement.value = option.value;
                        optionElement.textContent = option.textContent;
                        selectElement.options.add(optionElement);
                    }
                    field.setValue(selectedValue);
                    field.setMetaValue("disabled", options.length === 0);
                    field.setMetaValue("optionsInitialized", options.length !== 0);
                    return field.processChanges();
                },
                dependsOn
            });
        }
    }
}