
import * as actions from "./actions";
import { Request } from "./actions";
import { EffectManager } from "./effect-manager";
import * as formActions from "./form-actions";


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

export enum FormFieldTypeElementStatus {
    VALUE_SUCCESSFULLY_RECEIVED = "value-successfully-received",
    VALUE_SET_SUCCESS = "value-set-success",
    META_VALUE_SUCCESSFULLY_RECEIVED = "meta-value-successfully-received",
    META_VALUE_SET_SUCCESS = "meta-value-set-success",
    FAILED_TO_SET_VALUE = "failed-to-set-value",
    FAILED_TO_SET_META_VALUE = "failed-to-set-meta-value",
    INVALID_ELEMENT = "invalid-element",
    TYPE_MISMATCH = "type-mismatch",
    META_KEY_NOT_EXISTS = "meta-key-not-exists"
}

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

    public registrySequence: actions.RegistrySequence;
    constructor(public readonly name: string) {
        this.registrySequence = actions.Manager.fallback(`type-${name}`, "root");
    }

    isEqual(a: any, b: any): boolean { return a === b; }
    isEmpty() { }
    asElementType() { return "hidden"; }

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
    private _precision: number = 2;
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
}

export class FormFieldTypeSelect extends FormFieldType {
    private _multiple: boolean;
    private _of: FormFieldType;

    constructor() {
        super("Select");
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

export enum FormFieldChangeType {
    Value,
    MetaValue
}

export interface FormFieldValueChange {
    stateKey: string;
    type: FormFieldChangeType.Value;
    field: FormField;
    oldValue: any;
    newValue: any;
    initiator: any;
    processed: boolean;
    last: boolean;
    date: Date;
}

export interface FormFieldMetaValueChange {
    stateKey: string;
    type: FormFieldChangeType.MetaValue;
    field: FormField;
    metaKey: string;
    oldValue: any;
    newValue: any;
    initiator: any;
    processed: boolean;
    last: boolean;
    date: Date;
}

export type FormFieldChange = FormFieldValueChange | FormFieldMetaValueChange;

export class FormFieldChangesEvent extends Event {
    constructor(public changes: FormFieldChange[]) {
        super("changes", { cancelable: true });
    }
}

interface FormFieldChangeFilter {
    type?: FormFieldChangeType | null;
    onlyCurrentState?: boolean;
    last?: boolean | null;
    processed?: boolean | null;
}

interface FormFieldAnyChangeFilter extends FormFieldChangeFilter {
    type?: FormFieldChangeType | null;
    metaKey?: never;
}

interface FormFieldValueChangeFilter extends FormFieldChangeFilter {
    type: FormFieldChangeType.Value;
    metaKey?: never;
}

interface FormFieldMetaValueChangeFilter extends FormFieldChangeFilter {
    type: FormFieldChangeType.MetaValue;
    metaKey?: string | null;
}

export class FormFieldChangeSet {
    private _changes: FormFieldChange[];
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

    add(change: FormFieldChange): void {
        let lastChange: FormFieldChange | undefined | null = null;
        if (change.type === FormFieldChangeType.Value) {
            lastChange = this.getFieldChange(change.field, { type: FormFieldChangeType.Value });
        } else if (change.type === FormFieldChangeType.MetaValue) {
            lastChange = this.getFieldChange(change.field, { type: FormFieldChangeType.MetaValue, metaKey: change.metaKey });
        }
        if (lastChange != null) {
            lastChange.last = false;
        }
        this._changes.push(change);
        this.trimProcessedChanges();
    }

    remove(change: FormFieldChange): void {
        this._changes.splice(this._changes.indexOf(change), 1);
    }

    getFieldChange(field: FormField, filter: FormFieldValueChangeFilter): FormFieldValueChange | undefined;
    getFieldChange(field: FormField, filter: FormFieldMetaValueChangeFilter): FormFieldMetaValueChange | undefined;
    getFieldChange(field: FormField, filter: FormFieldAnyChangeFilter): FormFieldChange | undefined;
    getFieldChange(field: FormField, { onlyCurrentState = true, last = true, processed = false, type = null, metaKey = null }: FormFieldAnyChangeFilter | FormFieldValueChangeFilter | FormFieldMetaValueChangeFilter = {}): FormFieldChange | undefined {
        let changes = this.getFieldChanges(field, { onlyCurrentState, last, processed, type });
        if (type === FormFieldChangeType.MetaValue && metaKey != null) {
            changes = (changes as FormFieldMetaValueChange[]).filter(change => change.metaKey === metaKey);
        }
        return changes.at(-1);
    }

    getFieldChanges(field: FormField, filter?: FormFieldValueChangeFilter): FormFieldValueChange[];
    getFieldChanges(field: FormField, filter?: FormFieldMetaValueChangeFilter): FormFieldMetaValueChange[];
    getFieldChanges(field: FormField, filter?: FormFieldAnyChangeFilter): FormFieldChange[];
    getFieldChanges(field: FormField, { onlyCurrentState = true, last = true, processed = false, type = null }: FormFieldAnyChangeFilter | FormFieldValueChangeFilter | FormFieldMetaValueChangeFilter = {}): FormFieldChange[] {
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

    markProcessed(changes: FormFieldChange[]): void {
        changes.forEach(change => { change.processed = true; });
        this.trimProcessedChanges();
    }

    static asChangedName(change: FormFieldChange): string | null {
        if (change.type === FormFieldChangeType.Value) {
            return change.field.name;
        }
        if (change.type === FormFieldChangeType.MetaValue) {
            return getMetaDependencyKey(change.field.name, change.metaKey);
        }
        return null;
    }

    static asChangedNames(changes: FormFieldChange[]): Set<string> {
        const changedNames = new Set<string>();
        for (const change of changes) {
            const changedName = this.asChangedName(change);
            if (changedName == null) continue;
            changedNames.add(changedName);
        }
        return changedNames;
    }

    async processChanges(field: FormField, type: FormFieldChangeType | null = null, dryRun: boolean = false): Promise<Set<string>> {
        const lastChanges = this.getFieldChanges(field, { onlyCurrentState: true, type });
        if (!dryRun) {
            this.markProcessed(this.getFieldChanges(field, { onlyCurrentState: true, last: null, type }));
            field.dispatchEvent(new FormFieldChangesEvent(lastChanges));
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

    async reset({ stateKey = null, initiator = null, processChanges = false }: FormFieldContext = {}): Promise<Set<string>> {
        stateKey ??= this._currentStateKey;
        console.log("[FormField.reset] Reset state `%s` for field `%s`", stateKey, this.name);
        await this.setValue(this._initialValue, { raw: true, stateKey, initiator });
        for (const [metaKey, value] of this._initialMeta.entries()) {
            await this.setMetaValue(metaKey, value, { raw: true, stateKey, initiator });
        }
        return await this.processChanges(null, !processChanges);
    }

    async initializeState({ stateKey, initiator = null }: FormFieldContext & { stateKey: string }): Promise<void> {
        if (!this._initializedStateKeys.has(stateKey)) {
            console.log("[FormField.initializeState] Initializing state key `%s` for field `%s`", stateKey, this.name);
            this._initializedStateKeys.add(stateKey);
            this._valueMap.set(stateKey, null);
            this._metaMap.set(stateKey, new Map());
            await this.reset({ stateKey, initiator, processChanges: true });
        }
    }

    async switchState({ stateKey, initiator = null, processChanges = false }: FormFieldContext & { stateKey: string }): Promise<Set<string>> {
        console.log("[FormField.switchState] Switching state for field `%s` from `%s` to `%s`", this.name, this._currentStateKey, stateKey);
        await this.initializeState({ stateKey, initiator });
        const oldValue = this._valueMap.get(this._currentStateKey);
        const newValue = this._valueMap.get(stateKey);
        if (!this.type.isEqual(oldValue, newValue)) {
            const change: FormFieldChange = {
                stateKey,
                type: FormFieldChangeType.Value,
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
                const change: FormFieldChange = {
                    stateKey,
                    type: FormFieldChangeType.MetaValue,
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
        return await this.processChanges(null, !processChanges);
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

    async getValue({ stateKey = null, raw = false, disabledIsNull = true }: FormFieldContext = {}): Promise<any> {
        if (raw) {
            stateKey ??= this._currentStateKey
            await this.initializeState({ stateKey });
            return this._valueMap.get(stateKey);
        }
        if (disabledIsNull && await this.getMetaValue("disabled", { stateKey })) {
            return null;
        }
        const response = await formActions.getFieldValueAction.handle(new Request({ body: { field: this.getAdapter({ stateKey, raw: true }) } }));
        return response.body.value;
    }

    setInitialValue(newValue: any): void {
        this._initialValue = newValue;
    }

    async setValue(newValue: any, { stateKey = null, raw = false, initiator = null, processChanges = false }: FormFieldContext = {}): Promise<Set<string>> {
        if (raw) {
            initiator ??= this;
            stateKey ??= this._currentStateKey;
            await this.initializeState({ stateKey, initiator });
            const oldValue = await this.getValue({ stateKey, raw: true });
            if (this.type.isEqual(oldValue, newValue)) return new Set();
            this._valueMap.set(stateKey, newValue);
            const change: FormFieldChange = {
                stateKey,
                type: FormFieldChangeType.Value,
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
            return await this.processChanges(FormFieldChangeType.Value, !processChanges);
        }
        const response = await formActions.setFieldValueAction.handle(new Request({ body: { field: this.getAdapter({ stateKey, raw: true }), newValue } }));
        return response.body.changedNames;
    }

    async getMetaValue(metaKey: string, { stateKey = null, raw = false }: FormFieldContext = {}): Promise<any> {
        if (raw) {
            stateKey ??= this._currentStateKey
            await this.initializeState({ stateKey });
            const meta = this._metaMap.get(stateKey);
            return meta!.get(metaKey);
        }
        const response = await formActions.getFieldMetaValueAction.handle(new Request({ body: { field: this.getAdapter({ stateKey, raw: true }), metaKey } }));
        return response.body.value;
    }

    setInitialMetaValue(metaKey: string, newValue: any): void {
        this._initialMeta.set(metaKey, newValue);
    }

    async setMetaValue(metaKey: string, newValue: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FormFieldContext = {}): Promise<Set<string>> {
        if (raw) {
            initiator ??= this;
            stateKey ??= this._currentStateKey;
            await this.initializeState({ stateKey, initiator });
            const oldValue = await this.getMetaValue(metaKey, { stateKey, raw: true });
            if (oldValue === newValue) return new Set();
            this._metaMap.get(stateKey)!.set(metaKey, newValue);
            const change: FormFieldChange = {
                stateKey,
                type: FormFieldChangeType.MetaValue,
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
            return this.processChanges(FormFieldChangeType.MetaValue, !processChanges);
        }
        const response = await formActions.setFieldMetaValueAction.handle(new Request({ body: { field: this.getAdapter({ stateKey, raw: true }), metaKey, newValue } }));
        return response.body.changedNames;
    }

    async processChanges(type: FormFieldChangeType | null = null, dryRun: boolean = false): Promise<Set<string>> {
        return await this.changeSet.processChanges(this, type, dryRun);
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

    async getValue({ stateKey = null, disabledIsNull = true, raw = false }: FormFieldContext = {}): Promise<any> {
        for (const field of this.fieldArray) {
            const value = await field.getValue({ stateKey, disabledIsNull, raw });
            if (value == null) continue;
            return value;
        }
        return null;
    }

    async getMetaValue(metaKey: string, { stateKey = null, raw = false }: FormFieldContext = {}): Promise<any> {
        for (const field of this.fieldArray) {
            const value = await field.getMetaValue(metaKey, { stateKey, raw });
            if (value == null) continue;
            return value;
        }
        return null;
    }

    async setValue(value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FormFieldContext = {}): Promise<Set<string>> {
        let result;
        for (const field of this.fieldArray) {
            const changedNames = await field.setValue(value, { stateKey, initiator, processChanges, raw });
            if (changedNames.size === 0) continue;
            if (result == null) result = changedNames;
        }
        return result ?? new Set();
    }

    async setMetaValue(metaKey: string, value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FormFieldContext = {}): Promise<Set<string>> {
        let result;
        for (const field of this.fieldArray) {
            const changedNames = await field.setMetaValue(metaKey, value, { stateKey, initiator, processChanges, raw });
            if (changedNames.size === 0) continue;
            if (result == null) result = changedNames;
        }
        return result ?? new Set();
    }

    async processChanges(type: FormFieldChangeType | null = null, dryRun: boolean = false): Promise<Set<string>> {
        let result;
        for (const field of this.fieldArray) {
            const changedNames = await field.processChanges(type, dryRun);
            if (changedNames.size === 0) continue;
            if (result == null) result = changedNames;
        }
        return result ?? new Set();
    }
}

export abstract class FormFieldLinker {
    public field: FormField;
    public type: FormFieldType;

    constructor(field: FormField) {
        this.field = field;
        this.type = field.type;
    }

    abstract link(): Promise<void>;
    abstract unlink(): Promise<void>;
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

    override async link(): Promise<void> {
        // this.field.setInitialValue(this._getElementValue());
        // this.field.setInitialMetaValue("disabled", this._getElementMetaValue("disabled"));
        // this.field.setInitialMetaValue("visible", true);
        // this.field.setInitialMetaValue("container", this.element.parentElement);
        // if (["radio", "checkbox"].includes(this.type.asElementType())) {
        //     this.field.setInitialMetaValue("checked", this._getElementMetaValue("checked"));
        // }
        await this.field.reset({ processChanges: true, initiator: this });

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

    override async unlink(): Promise<void> {
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
        const changes = (event as FormFieldChangesEvent).changes.filter(change => change.initiator !== this);
        for (const change of changes) {
            if (change.type === FormFieldChangeType.Value) {
                this._syncElementValue();
            } else if (change.type === FormFieldChangeType.MetaValue) {
                this._syncElementMetaValue(change.metaKey);
            }
        }
    }

    async _initializeFieldState(): Promise<void> {
        console.log("[FormFieldElementLinker._syncElementValue] Initialize field initial state");
        const response = await formActions..handle(new Request({ body: { element: this.element, field: this.field } }));
    }

    async _syncElementValue(): Promise<void> {
        console.log("[FormFieldElementLinker._syncElementValue] Syncing element value");
        const response = await formActions.syncElementValueFromFieldAction.handle(new Request({ body: { element: this.element, field: this.field } }));
    }

    async _syncFieldValue(): Promise<void> {
        console.log("[FormFieldElementLinker._syncFieldValue] Syncing field value");
        const response = await formActions.syncFieldValueFromElementAction.handle(new Request({ body: { element: this.element, field: this.field.getAdapter({ initiator: this, processChanges: true, raw: true }) } }));
    }

    async _syncElementMetaValue(metaKey: string): Promise<void> {
        console.log("[FormFieldElementLinker._syncElementMetaValue] Syncing element meta value");
        const response = await formActions.syncElementMetaValueFromFieldAction.handle(new Request({ body: { element: this.element, field: this.field, metaKey } }));
        // switch (metaKey) {
        //     case "visible":
        //         const container = this.field.getMetaValue("container") as HTMLElement;
        //         if (this._handleHideContainer != null) {
        //             container.removeEventListener("transitionend", this._handleHideContainer);
        //             this._handleHideContainer = null;
        //         }
        //         if (value) {
        //             if (container.style.display === "none") {
        //                 container.style.display = "";
        //                 requestAnimationFrame(() => {
        //                     container.dataset.visible = "true";
        //                 });
        //             } else {
        //                 container.dataset.visible = "true";
        //             }
        //         } else {
        //             if (container.style.display !== "none") {
        //                 this._handleHideContainer = (event: Event) => {
        //                     container.style.display = "none";
        //                 };
        //                 container.addEventListener("transitionend", this._handleHideContainer, { once: true });
        //             }
        //             container.dataset.visible = "false";
        //         }
        //         break;
        //     case "autofill":
        //         this.element.classList.toggle("autofill", !!value);
        //         break;
        //     case "optionsInitialized":
        //         // console.log("options initialized", !!value);
        //         if (value) {
        //             this._syncElementValue();
        //         }
        //         break;
        // }
    }

    async _syncFieldMetaValue(metaKey: string): Promise<void> {
        console.log("[FormFieldElementLinker._syncFieldMeta] Syncing field meta value");
        const response = await formActions.syncFieldMetaValueFromElementAction.handle(new Request({ body: { element: this.element, field: this.field.getAdapter({ initiator: this, processChanges: true, raw: true }) } }));
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
        this.dispatchEvent(new FormFieldChangesEvent((event as FormFieldChangesEvent).changes));
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
    abstract manage(form: Form, changes: FormFieldChange[]): void;
}

export class FormChangesForRadioManager extends FormChangesManager {
    override manage(form: Form, changes: FormFieldChange[]): void {
        changes.filter(change =>
            change.initiator !== form &&
            change.field.type.asElementType() === "radio" &&
            change.type === FormFieldChangeType.MetaValue &&
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
    override manage(form: Form, changes: FormFieldChange[]): void {
        changes = changes.filter(change => change.initiator !== form);
        if (changes.length === 0) return;
        form.effectManager.triggerEffects({ keys: FormFieldChangeSet.asChangedNames(changes) });
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
            await this.registerElements();
        }
    }

    _handleChanges(event: Event) {
        const changes = (event as FormFieldChangesEvent).changes;
        for (const changesManager of this._changesManagers) {
            changesManager.manage(this, changes);
        }
    }

    registerChangesManager(changesManager: FormChangesManager) {
        this._changesManagers.push(changesManager);
    }

    async getFormData(): Promise<Record<string, any>> {
        const formData: Record<string, any> = {};
        for (const fieldName of this.fields) {
            formData[fieldName] = await this.fields.get(fieldName).getValue();
        }
        return formData;
    }

    async registerElements(): Promise<void> {
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

    async reset(): Promise<void> {
        for (const field of this.fields.list) {
            await field.reset({ initiator: this });
        }
        await this.effectManager.triggerEffects();
    }

    addDisableWhenEffect(fieldName: string, disableWhen: () => Promise<boolean> | boolean, dependsOn: string[]): void {
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "disabled"),
            value: {
                type: "disable-when",
                callback: async () => {
                    const disabled = await disableWhen();
                    // console.log(`[Effect.DisableWhen] Field ${fieldName} disabled: `, disabled);
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    return await field.setMetaValue("disabled", disabled, { processChanges: true });
                },
            },
            dependsOn
        });
    }

    addVisibleWhenEffect(fieldName: string, visibleWhen: () => Promise<boolean> | boolean, dependsOn: string[]): void {
        this.addDisableWhenEffect(fieldName, async () => !await visibleWhen(), dependsOn);
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "visible"),
            value: {
                type: "visible-when",
                callback: async () => {
                    const visible = await visibleWhen();
                    // console.log(`[Effect.VisibleWhen] Field ${fieldName} visible: `, visible);
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    return await field.setMetaValue("visible", visible, { processChanges: true });
                },
            },
            dependsOn: [getMetaDependencyKey(fieldName, "disabled")]
        });
    }

    addComputedFieldEffect(fieldName: string, fieldType: FormFieldType, compute: () => Promise<any> | any, dependsOn: string[]): void {
        this.fields.add(new FormField(fieldName, fieldType, { changeSet: this.changeSet, effectManager: this.effectManager }))
        this.effectManager.registerNode({
            key: fieldName,
            value: {
                type: "computed-field",
                callback: async () => {
                    const value = await compute();
                    // console.log(`[Effect.ComputedField] Field ${fieldName} value: `, value);
                    const field = this.fields.get(fieldName);
                    return await field.setValue(value, { initiator: this, processChanges: true });
                },
            },
            dependsOn
        });
    }

    addFieldAutofillEffect(fieldName: string, autofillWith: () => Promise<any> | any, dependsOn: string[]): void {
        this.effectManager.addDependency(fieldName, getMetaDependencyKey(fieldName, "autofill"));
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "autofill"),
            value: {
                type: "field-autofill",
                callback: async () => {
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    const dirty = await field.getMetaValue("dirty");
                    field.setMetaValue("autofill", !dirty);
                    if (dirty) {
                        return await field.processChanges();
                    }
                    const value = await autofillWith();
                    // console.log(`[Effect.FieldAutofill] Field ${fieldName} value: `, value);
                    await field.setMetaValue("autofill", (await field.setValue(value)).size !== 0);
                    return await field.processChanges();
                },
            },
            dependsOn: [getMetaDependencyKey(fieldName, "dirty"), ...dependsOn]
        });
    }

    addSelectOptionsInitializerEffect(fieldName: string, getDefaultOption: () => Promise<Option> | Option, getOptions: () => Promise<Option[]> | Option[], dependsOn: string[]): void {
        this.effectManager.registerNode({
            key: fieldName,
            value: {
                type: "select-options-initializer",
                callback: async () => {
                    const defaultOption = await getDefaultOption();
                    const options = await getOptions();
                    const selectElement = this.getElement(fieldName) as HTMLSelectElement;
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    const selectedValue = await field.getValue({ disabledIsNull: false });
                    await field.setValue(defaultOption.value);
                    selectElement.innerHTML = "";
                    for (const option of [defaultOption, ...options]) {
                        const optionElement = document.createElement("option");
                        optionElement.value = option.value;
                        optionElement.textContent = option.textContent;
                        selectElement.options.add(optionElement);
                    }
                    await field.setValue(selectedValue);
                    await field.setMetaValue("disabled", options.length === 0);
                    await field.setMetaValue("optionsInitialized", options.length !== 0);
                    return await field.processChanges();
                },
            },
            dependsOn
        });
    }
}