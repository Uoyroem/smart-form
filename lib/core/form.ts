
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
        return `${fieldName}:${metaKey}`;
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
                throw new Error("There are cyclic dependencies");
                // console.error("There are cyclic dependencies.");
            } else {
                // console.log("Dependency map successfully built.")
                // console.log(this._topologicalOrder);
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
                // console.group("Triggering all effects");
            } else {
                // console.group("Triggering effects for changed names: ", changedNames)
            }

            for (const name of this._topologicalOrder) {
                if (changedNames != null && this._dependentMap.get(name)!.intersection(changedNames).size === 0) {
                    continue;
                }
                // console.group("Triggering effect: ", name);
                const effect = this._nameEffect.get(name);
                if (effect != null) {
                    const changedNamesByEffect = await effect.callback();
                    if (changedNames) {
                        changedNamesByEffect.forEach(changedName => { changedNames.add(changedName); });
                    }
                } else {
                    if (changedNames) {
                        changedNames.add(name);
                        // console.log("There were changes");
                    }
                }
                // console.groupEnd();
            }
            // console.groupEnd();
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

    export class FormFieldValidatorRequired extends FormFieldValidator {
        constructor() {
            super("Required");
        }

        validate(field: FormField): void {

        }
    }

    export type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    export class FormFieldType {
        static object() {
            return new FormFieldTypeObject();
        }

        static text() {
            return new FormFieldTypeText();
        }

        static number() {
            return new FormFieldTypeNumber();
        }

        static date() {
            return new FormFieldTypeDate();
        }

        static select({ multiple = false } = {}) {
            return new FormFieldTypeSelect().multiple(multiple);
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

        getFieldValue(field: FormField): any {
            return field.getValue();
        }

        getFieldMetaValue(field: FormField, metaKey: string): any {
            return field.getMetaValue(metaKey);
        }

        setFieldValue(field: FormField, newValue: any): Set<string> {
            return field.setValue(newValue);
        }

        setFieldMetaValue(field: FormField, metaKey: string, newValue: any): Set<string> {
            return field.setMetaValue(metaKey, newValue);
        }

        getInitialValue(): any {
            return null;
        }

        getInitialMeta(): Map<string, any> {
            const meta = new Map();
            meta.set("disabled", false);
            meta.set("dirty", false);
            return meta;
        }

        isSameType(otherType: FormFieldType): boolean {
            return this.name === otherType.name;
        }
    }

    export class FormFieldTypeText extends FormFieldType {
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

    export class FormFieldTypeNumber extends FormFieldType {
        constructor() {
            super("Number");
        }

        asElementType(): string {
            return "number";
        }
    }

    export class FormFieldTypeDate extends FormFieldType {
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

        getInitialMeta(): Map<string, any> {
            const meta = super.getInitialMeta();
            meta.set("checked", false);
            return meta;
        }

        getFieldValue(field: FormField): any {
            return field.getMetaValue("checked") ? field.getValue() : null;
        }

        setFieldValue(field: FormField, newValue: any): any {
            return field.setMetaValue("checked", newValue != null && field.getValue() === newValue);
        }
    }

    export class FormFieldTypeCheckbox extends FormFieldType {
        constructor() {
            super("Checkbox");
        }

        asElementType(): string {
            return "checkbox";
        }

        getInitialMeta(): Map<string, any> {
            const meta = super.getInitialMeta();
            meta.set("checked", false);
            return meta;
        }

        getFieldValue(field: FormField): any {
            const value = field.getValue();
            if (["", "on"].includes(value)) return field.getMetaValue("checked");
            return field.getMetaValue("checked") ? value : null;
        }

        setFieldValue(field: FormField, newValue: any): any {
            if (["", "on"].includes(field.getValue())) return field.setMetaValue("checked", newValue);
            return field.setMetaValue("checked", newValue != null && field.getValue() === newValue);
        }
    }

    export class FormFieldTypeSelect extends FormFieldType {
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

        getInitialMeta(): Map<string, any> {
            const meta = super.getInitialMeta();
            meta.set("optionsInitialized", false);
            return meta;
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

    export class FormFieldTypeObject extends FormFieldType {
        constructor() {
            super("Object");
        }

        isEqual(a: any, b: any): boolean {
            return deepEqual(a, b);
        }
    }

    export enum ChangeType {
        VALUE = "value",
        META_VALUE = "metavalue"
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
        type: ChangeType.META_VALUE;
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

    interface ChangeFilter {
        type?: ChangeType | null;
        onlyCurrentState?: boolean;
        last?: boolean | null;
        processed?: boolean | null;
    }

    interface AnyChangeFilter extends ChangeFilter {
        type?: ChangeType | null;
        metaKey?: never;
    }

    interface ValueChangeFilter extends ChangeFilter {
        type: ChangeType.VALUE;
        metaKey?: never;
    }

    interface MetaValueChangeFilter extends ChangeFilter {
        type: ChangeType.META_VALUE;
        metaKey?: string | null;
    }

    export class FormFieldChangeSet {
        private _changes: Change[];
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

        add(change: Change): void {
            let lastChange: Change | undefined | null = null;
            if (change.type === ChangeType.VALUE) {
                lastChange = this.getFieldChange(change.field, { type: ChangeType.VALUE });
            } else if (change.type === ChangeType.META_VALUE) {
                lastChange = this.getFieldChange(change.field, { type: ChangeType.META_VALUE, metaKey: change.metaKey });
            }
            if (lastChange != null) {
                lastChange.last = false;
            }
            this._changes.push(change);
            this.trimProcessedChanges();
        }

        remove(change: Change): void {
            this._changes.splice(this._changes.indexOf(change), 1);
        }

        getFieldChange(field: FormField, filter: ValueChangeFilter): ValueChange | undefined;
        getFieldChange(field: FormField, filter: MetaValueChangeFilter): MetaValueChange | undefined;
        getFieldChange(field: FormField, filter: AnyChangeFilter): Change | undefined;
        getFieldChange(field: FormField, { onlyCurrentState = true, last = true, processed = false, type = null, metaKey = null }: AnyChangeFilter | ValueChangeFilter | MetaValueChangeFilter = {}): Change | undefined {
            let changes = this.getFieldChanges(field, { onlyCurrentState, last, processed, type });
            if (type === ChangeType.META_VALUE && metaKey != null) {
                changes = (changes as MetaValueChange[]).filter(change => change.metaKey === metaKey);
            }
            return changes.at(-1);
        }

        getFieldChanges(field: FormField, filter?: ValueChangeFilter): ValueChange[];
        getFieldChanges(field: FormField, filter?: MetaValueChangeFilter): MetaValueChange[];
        getFieldChanges(field: FormField, filter?: AnyChangeFilter): Change[];
        getFieldChanges(field: FormField, { onlyCurrentState = true, last = true, processed = false, type = null }: AnyChangeFilter | ValueChangeFilter | MetaValueChangeFilter = {}): Change[] {
            let changes = this._changes.filter(change => change.field === field);
            if (type != null) { changes = changes.filter(change => change.type === type); }
            if (last != null) { changes = changes.filter(change => change.last === last); }
            if (processed != null) { changes = changes.filter(change => change.processed === processed); }
            if (onlyCurrentState) { changes = changes.filter(change => change.stateKey === field.currentStateKey); }
            return changes
        }

        hasChanges(field: FormField): boolean {
            return this.getFieldChanges(field, { onlyCurrentState: true, last: true }).length !== 0;
        }

        markProcessed(changes: Change[]): void {
            changes.forEach(change => { change.processed = true; });
            this.trimProcessedChanges();
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

        processChanges(field: FormField, type: ChangeType | null = null, dryRun: boolean = false): Set<string> {
            const lastChanges = this.getFieldChanges(field, { onlyCurrentState: true, type });
            if (!dryRun) {
                this.markProcessed(this.getFieldChanges(field, { onlyCurrentState: true, last: null, type }));
                field.dispatchEvent(new ChangesEvent(lastChanges));
            }
            return FormFieldChangeSet.asChangedNames(lastChanges);
        }
    }

    export interface FormFieldContext {
        stateKey?: string | null;
        initiator?: any | null;
        processChanges?: boolean;
        disabledIsNull?: boolean;
        raw?: boolean;
    }

    export class FormField extends EventTarget {
        private _name: string;
        private _type: FormFieldType;
        private _changeSet: FormFieldChangeSet;
        private _initializedStateKeys: Set<string>;
        private _initialValue: any;
        private _valueMap: Map<string, any>;
        private _initialMeta: Map<string, any>;
        private _metaMap: Map<string, Map<string, any>>;
        private _currentStateKey: string;

        constructor(name: string, type: FormFieldType, { changeSet = null, effectManager = null }: { changeSet?: FormFieldChangeSet | null, effectManager?: EffectManager | null } = {}) {
            super();
            this._name = name;
            this._type = type;
            this._initializedStateKeys = new Set();

            this._initialValue = this.type.getInitialValue();
            this._valueMap = new Map();

            this._initialMeta = this.type.getInitialMeta();
            this._metaMap = new Map();

            this._changeSet = changeSet ?? new FormFieldChangeSet(32);
            this._currentStateKey = "default";
            this.initializeState({ stateKey: "default" });
            if (effectManager != null) {
                this.initializeDependencies(effectManager);
            }
        }

        get self(): this {
            return this;
        }

        get currentStateKey() {
            return this._currentStateKey;
        }

        get context(): FormFieldContext {
            return {
                disabledIsNull: true,
                initiator: null,
                stateKey: null,
                raw: false,
                processChanges: false
            };
        }

        get changeSet(): FormFieldChangeSet {
            return this._changeSet;
        }

        get name(): string {
            return this._name;
        }

        get type(): FormFieldType {
            return this._type;
        }

        clearInitialMeta(): void {
            this._initialMeta = new Map();
        }

        reset({ stateKey = null, initiator = null, processChanges = false }: FormFieldContext = {}): Set<string> {
            stateKey ??= this._currentStateKey;
            console.log("[FormField.reset] Reset state `%s` for field `%s`", stateKey, this.name);
            this.setValue(this._initialValue, { raw: true, stateKey, initiator });
            for (const [metaKey, value] of this._initialMeta.entries()) {
                this.setMetaValue(metaKey, value, { raw: true, stateKey, initiator });
            }
            return this.processChanges(null, !processChanges);
        }

        initializeState({ stateKey, initiator = null }: FormFieldContext & { stateKey: string }): void {
            if (!this._initializedStateKeys.has(stateKey)) {
                console.log("[FormField.initializeState] Initializing state key `%s` for field `%s`", stateKey, this.name);
                this._initializedStateKeys.add(stateKey);
                this._valueMap.set(stateKey, null);
                this._metaMap.set(stateKey, new Map());
                this.reset({ stateKey, initiator, processChanges: true });
            }
        }

        switchState({ stateKey, initiator = null, processChanges = false }: FormFieldContext & { stateKey: string }): Set<string> {
            console.log("[FormField.switchState] Switching state for field `%s` from `%s` to `%s`", this.name, this._currentStateKey, stateKey);
            this.initializeState({ stateKey, initiator });
            const oldValue = this._valueMap.get(this._currentStateKey);
            const newValue = this._valueMap.get(stateKey);
            if (!this.type.isEqual(oldValue, newValue)) {
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
            }

            for (const [metaKey, newValue] of this._metaMap.get(stateKey)!.entries()) {
                const oldValue = this._metaMap.get(this._currentStateKey)!.get(metaKey);
                if (oldValue !== newValue) {
                    const change: Change = {
                        stateKey,
                        type: ChangeType.META_VALUE,
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
            this._currentStateKey = stateKey;
            return this.processChanges(null, !processChanges);
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

        getAdapter(outerContext: FormFieldContext) {
            return new Proxy(this, {
                get(target, propertyKey, receiver) {
                    switch (propertyKey) {
                        case "self":
                            return target;
                        case "context":
                            return outerContext;
                        case "getAdapter":
                            return (innerContext: FormFieldContext = {}) => target.getAdapter({ ...outerContext, ...innerContext });
                        case "getValue":
                            return (innerContext: FormFieldContext = {}) => target.getValue({ ...outerContext, ...innerContext });
                        case "getMetaValue":
                            return (metaKey: string, innerContext: FormFieldContext = {}) => target.getMetaValue(metaKey, { ...outerContext, ...innerContext });
                        case "setValue":
                            return (newValue: any, innerContext: FormFieldContext = {}) => target.setValue(newValue, { ...outerContext, ...innerContext });
                        case "setMetaValue":
                            return (metaKey: string, newValue: any, innerContext: FormFieldContext = {}) => target.setMetaValue(metaKey, newValue, { ...outerContext, ...innerContext });
                        default:
                            const value = Reflect.get(target, propertyKey, receiver);
                            return typeof value === "function" ? value.bind(target) : value;
                    }
                }
            });
        }

        getValue({ stateKey = null, raw = false, disabledIsNull = true }: FormFieldContext = {}): any {
            if (raw) {
                stateKey ??= this._currentStateKey
                this.initializeState({ stateKey });
                return this._valueMap.get(stateKey);
            }
            if (disabledIsNull && this.getMetaValue("disabled", { stateKey })) {
                return null;
            }
            return this.type.getFieldValue(this.getAdapter({ stateKey, raw: true }));
        }

        setInitialValue(newValue: any): void {
            this._initialValue = newValue;
        }

        setValue(newValue: any, { stateKey = null, raw = false, initiator = null, processChanges = false }: FormFieldContext = {}): Set<string> {
            if (raw) {
                initiator ??= this;
                stateKey ??= this._currentStateKey;
                this.initializeState({ stateKey, initiator });
                const oldValue = this.getValue({ stateKey, raw: true });
                if (this.type.isEqual(oldValue, newValue)) return new Set();
                this._valueMap.set(stateKey, newValue);
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
                console.log("[FormField.setValue] Value changed:", { oldValue, newValue, stateKey });
                this.changeSet.add(change);
                return this.processChanges(ChangeType.VALUE, !processChanges);
            }
            return this.type.setFieldValue(this.getAdapter({ stateKey, raw: true, processChanges, initiator }), newValue);
        }

        getMetaValue(metaKey: string, { stateKey = null, raw = false }: FormFieldContext = {}): any {
            if (raw) {
                stateKey ??= this._currentStateKey
                this.initializeState({ stateKey });
                const meta = this._metaMap.get(stateKey);
                return meta!.get(metaKey);
            }
            return this.type.getFieldMetaValue(this.getAdapter({ raw: true, stateKey }), metaKey);
        }

        setInitialMetaValue(metaKey: string, newValue: any): void {
            this._initialMeta.set(metaKey, newValue);
        }

        setMetaValue(metaKey: string, newValue: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FormFieldContext = {}): Set<string> {
            if (raw) {
                initiator ??= this;
                stateKey ??= this._currentStateKey;
                this.initializeState({ stateKey, initiator });
                const oldValue = this.getMetaValue(metaKey, { stateKey });
                if (oldValue === newValue) return new Set();
                this._metaMap.get(stateKey)!.set(metaKey, newValue);
                const change: Change = {
                    stateKey,
                    type: ChangeType.META_VALUE,
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
                console.log("[FormField.setMetaValue] Meta", getMetaDependencyKey(this.name, metaKey), "value changed:", { oldValue, newValue, stateKey });
                return this.processChanges(ChangeType.META_VALUE, !processChanges);
            }
            return this.type.setFieldMetaValue(this.getAdapter({ stateKey, raw: true, initiator, processChanges }), metaKey, newValue);
        }

        processChanges(type: ChangeType | null = null, dryRun: boolean = false): Set<string> {
            return this.changeSet.processChanges(this, type, dryRun);
        }
    }

    export class FormFieldArray {
        constructor(public fieldArray: FormField[]) { }

        getAdapter(outerContext: FormFieldContext) {
            return new Proxy(this, {
                get(target, propertyKey, receiver) {
                    switch (propertyKey) {
                        case "self":
                            return target;
                        case "context":
                            return outerContext;
                        case "getAdapter":
                            return (innerContext: FormFieldContext = {}) => target.getAdapter({ ...outerContext, ...innerContext });
                        case "getValue":
                            return (innerContext: FormFieldContext = {}) => target.getValue({ ...outerContext, ...innerContext });
                        case "getMetaValue":
                            return (metaKey: string, innerContext: FormFieldContext = {}) => target.getMetaValue(metaKey, { ...outerContext, ...innerContext });
                        case "setValue":
                            return (newValue: any, innerContext: FormFieldContext = {}) => target.setValue(newValue, { ...outerContext, ...innerContext });
                        case "setMetaValue":
                            return (metaKey: string, newValue: any, innerContext: FormFieldContext = {}) => target.setMetaValue(metaKey, newValue, { ...outerContext, ...innerContext });
                        default:
                            const value = Reflect.get(target, propertyKey, receiver);
                            return typeof value === "function" ? value.bind(target) : value;
                    }
                }
            });
        }

        getValue({ stateKey = null, disabledIsNull = true, raw = false }: FormFieldContext = {}): any {
            return this.fieldArray.map(field => field.getValue({ stateKey, disabledIsNull, raw })).find(value => value != null);
        }

        getMetaValue(metaKey: string, { stateKey = null, raw = false }: FormFieldContext = {}): any {
            return this.fieldArray.map(field => field.getMetaValue(metaKey, { stateKey, raw })).find(value => value != null);
        }

        setValue(value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FormFieldContext = {}): Set<string> {
            return this.fieldArray.map(field => field.setValue(value, { stateKey, initiator, processChanges, raw })).find(changedNames => changedNames.size !== 0) ?? new Set();
        }

        setMetaValue(metaKey: string, value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FormFieldContext = {}): Set<string> {
            return this.fieldArray.map(field => field.setMetaValue(metaKey, value, { stateKey, initiator, processChanges, raw })).find(changedNames => changedNames.size !== 0) ?? new Set();
        }

        processChanges(type: ChangeType | null = null, dryRun: boolean = false): Set<string> {
            return this.fieldArray.map(field => field.processChanges(type, dryRun)).find(changedNames => changedNames.size !== 0) ?? new Set();
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
        private _handleHideContainer: ((event: Event) => void) | null;
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
            this._handleHideContainer = null;
            this._mutationObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === "attributes") {
                        switch (mutation.attributeName) {
                            case "disabled":
                                this._syncFieldMetaValue("disabled");
                                break;
                        }
                    }
                }
            });
        }

        override link(): void {
            this.field.setInitialValue(this._getElementValue());
            this.field.setInitialMetaValue("disabled", this._getElementMetaValue("disabled"));
            this.field.setInitialMetaValue("visible", true);
            if (["radio", "checkbox"].includes(this.type.asElementType())) {
                this.field.setInitialMetaValue("checked", this._getElementMetaValue("checked"));
            }
            this.field.reset({ processChanges: true, initiator: this });

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

        override unlink(): void {
            this.field.removeEventListener("changes", this._fieldChangesEventListener);
            if (["text", "number", "textarea"].includes(this.type.asElementType())) {
                this.element.removeEventListener("input", this._elementValueInputEventListener);
            } else {
                this.element.removeEventListener("change", this._elementValueChangeEventListener);
            }
            this._mutationObserver.disconnect();
        }

        _elementValueInputEventListener(event: Event): void {
            console.log("[FormFieldElementLinker._elementValueInputEventListener] Event")
            this.field.setMetaValue("dirty", true, { initiator: this, processChanges: true });
            this._syncFieldValue();
        }

        _elementValueChangeEventListener(event: Event): void {
            this.field.setMetaValue("dirty", true, { initiator: this, processChanges: true });
            if (["radio", "checkbox"].includes(this.type.asElementType())) {
                this._syncFieldMetaValue("checked");
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
                } else if (change.type === ChangeType.META_VALUE) {
                    this._syncElementMetaValue(change.metaKey);
                }
            }
        }

        _syncElementValue(): boolean {
            console.log("[FormFieldElementLinker._syncElementValue] Syncing element value");
            const value = this.field.getValue({ raw: true });
            const optionsInitialized = this.field.getMetaValue("optionsInitialized");
            switch (this.type.asElementType()) {
                case "select-multiple":
                    if (!optionsInitialized) {
                        // console.log("PENDING OPTIONS INITIALIZE", value);
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
                        // console.log("PENDING OPTIONS INITIALIZE", value);
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
            console.log("[FormFieldElementLinker._syncFieldValue] Syncing field value");
            this.field.setValue(this._getElementValue(), { initiator: this, processChanges: true, raw: true });
        }

        _syncElementMetaValue(metaKey: string): void {
            console.log("[FormFieldElementLinker._syncElementMetaValue] Syncing element meta value");

            const value = this.field.getMetaValue(metaKey, { raw: true });
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
                        if (this._handleHideContainer != null) {
                            container.removeEventListener("transitionend", this._handleHideContainer);
                            this._handleHideContainer = null;
                        }
                        if (value) {
                            if (container.style.display === "none") {
                                container.style.display = "";
                                requestAnimationFrame(() => {
                                    container.dataset.visible = "true";
                                });
                            } else {
                                container.dataset.visible = "true";
                            }
                        } else {
                            if (container.style.display !== "none") {
                                this._handleHideContainer = (event: Event) => {
                                    container.style.display = "none";
                                };
                                container.addEventListener("transitionend", this._handleHideContainer, { once: true });
                            }
                            container.dataset.visible = "false";
                        }
                    }
                    break;
                case "autofill":
                    this.element.classList.toggle("autofill", !!value);
                    break;
                case "optionsInitialized":
                    // console.log("options initialized", !!value);
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

        _syncFieldMetaValue(metaKey: string): void {
            console.log("[FormFieldElementLinker._syncFieldMeta] Syncing field meta value");
            this.field.setMetaValue(metaKey, this._getElementMetaValue(metaKey), { initiator: this, processChanges: true });
        }
    }

    export class FormFields extends EventTarget {
        public list: FormField[];

        constructor() {
            super();
            this.list = [];
            this._fieldChangesEventListener = this._fieldChangesEventListener.bind(this);
        }

        _fieldChangesEventListener(event: Event) {
            this.dispatchEvent(new ChangesEvent((event as ChangesEvent).changes));
        }

        add(field: FormField) {
            field = field.self;
            if (this.list.includes(field)) return false;
            field.addEventListener("changes", this._fieldChangesEventListener);
            this.list.push(field);
            return true;
        }

        remove(field: FormField) {
            field = field.self;
            if (!this.list.includes(field)) return false;
            field.removeEventListener("changes", this._fieldChangesEventListener);
            this.list.splice(this.list.indexOf(field), 1);
            return true;
        }

        get(fieldName: string): FormField | FormFieldArray {
            const fields = this.list.filter(field => field.name === fieldName)
            return fields.length === 1 ? fields[0] : new FormFieldArray(fields);
        }

        [Symbol.iterator](): Iterator<string> {
            return new Set(this.list.map(field => field.name)).values();
        }
    }

    export interface Option {
        value: string;
        textContent: string;
    }

    export abstract class FormChangesManager {
        abstract manage(form: Form, changes: Change[]): void;
    }

    export class FormChangesForRadioManager extends FormChangesManager {
        override manage(form: Form, changes: Change[]): void {
            changes.filter(change =>
                change.initiator !== form &&
                change.field.type.asElementType() === "radio" &&
                change.type === ChangeType.META_VALUE &&
                change.metaKey === "checked" &&
                change.newValue
            ).forEach(change => {
                form.fields.list.filter(field =>
                    field.name === change.field.name &&
                    field.type.asElementType() === "radio" &&
                    field != change.field &&
                    field.getMetaValue("checked")
                ).forEach(field => {
                    field.setMetaValue("checked", false, { initiator: form, processChanges: true });
                });
            });
        }
    }

    export class FormChangesForTriggerEffectsManager extends FormChangesManager {
        override manage(form: Form, changes: Change[]): void {
            changes = changes.filter(change => change.initiator !== form);
            if (changes.length === 0) return;
            form.effectManager.triggerEffects({ changedNames: FormFieldChangeSet.asChangedNames(changes) });
        }
    }

    export class Form extends EventTarget {
        public form: HTMLFormElement;
        public effectManager: EffectManager;
        public fields: FormFields;
        public fieldLinkers: FormFieldLinker[];
        public changeSet: FormFieldChangeSet;
        private _changesManagers: FormChangesManager[];

        constructor({ form }: { form: HTMLFormElement }) {
            super();
            this.form = form;
            this.changeSet = new FormFieldChangeSet();
            this.effectManager = new EffectManager();
            this.fields = new FormFields();
            this.fieldLinkers = [];
            this._changesManagers = [];
            this._handleChanges = this._handleChanges.bind(this);
        }

        async setup() {
            if (this.form != null) {
                this.form.classList.add("uoyroem-form");
                this.form.noValidate = true;

                this.form.addEventListener("submit", (event) => {
                    event.preventDefault();
                    this.submit().then(() => this.reset());
                });

                this.form.addEventListener("reset", (event) => {
                    event.preventDefault();
                    this.reset();
                });

                this.fields.addEventListener("changes", this._handleChanges);
                this.registerChangesManager(new FormChangesForRadioManager());
                this.registerChangesManager(new FormChangesForTriggerEffectsManager());
                this.registerElements();
            }
        }

        _handleChanges(event: Event) {
            const changes = (event as ChangesEvent).changes;
            for (const changesManager of this._changesManagers) {
                changesManager.manage(this, changes);
            }
        }

        registerChangesManager(changesManager: FormChangesManager) {
            this._changesManagers.push(changesManager);
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
                    // console.log(`[Effect.DisableWhen] Field ${fieldName} disabled: `, disabled);
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
                    // console.log(`[Effect.VisibleWhen] Field ${fieldName} visible: `, visible);
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
                    // console.log(`[Effect.ComputedField] Field ${fieldName} value: `, value);
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
                    // console.log(`[Effect.FieldAutofill] Field ${fieldName} value: `, value);
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