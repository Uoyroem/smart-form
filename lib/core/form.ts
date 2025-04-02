import { EffectManager } from "./effect-manager";
import { FormAction, FormActionHandler, FormActionRegistry, FormActionRequest, FormActionRequestBody, FormActionResponseBody, FormActionResponse, FormActionResponseStatus } from "./form-action";

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

export interface FormActionFieldValueRequestBody extends FormActionRequestBody {
    field: FormField;
}

export interface FormActionFieldMetaValueRequestBody extends FormActionRequestBody {
    field: FormField;
    metaKey: string;
}

export interface FormActionElementValueRequestBody extends FormActionRequestBody {
    element: Element;
}

export interface FormActionElementMetaValueRequestBody extends FormActionRequestBody {
    element: Element;
    metaKey: string;
}

export interface FormActionValueResponseBody extends FormActionResponseBody {
    value: any;
}

export interface FormActionMetaValueResponseBody extends FormActionResponseBody {
    value: any;
}

class FormGetFieldValueActionHandler extends FormActionHandler<FormActionFieldValueRequestBody, FormActionValueResponseBody> {
    override async handle(request: FormActionRequest<FormActionFieldValueRequestBody>, registry: FormActionRegistry): Promise<FormActionResponse<FormActionValueResponseBody>> {
        return new FormActionResponse({ value: request.body.field.getValue() }, FormActionResponseStatus.Success)
    }
}

class FormGetFieldMetaValueActionHandler extends FormActionHandler<FormActionFieldMetaValueRequestBody, FormActionMetaValueResponseBody> {
    override async handle(request: FormActionRequest<FormActionFieldMetaValueRequestBody>, registry: FormActionRegistry): Promise<FormActionResponse<FormActionMetaValueResponseBody>> {
        return new FormActionResponse({ value: request.body.field.getMetaValue(request.body.metaKey) }, FormActionResponseStatus.Success)
    }
}


const getFieldValue = new FormAction(new FormGetFieldValueActionHandler());
const getFieldMetaValue = new FormAction(new FormGetFieldMetaValueActionHandler());


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

    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    isEqual(a: any, b: any): boolean { return a === b; }
    isEmpty() { }
    asElementType() { return "hidden"; }

    fetch() {
    }

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

    getElementValue(element: Element): [any, FormFieldTypeElementStatus] {
        if (!FormFieldType.isFormElement(element)) {
            return [null, FormFieldTypeElementStatus.INVALID_ELEMENT];
        }
        if (element.type !== this.asElementType()) {
            return [null, FormFieldTypeElementStatus.TYPE_MISMATCH];
        }
        return [element.value, FormFieldTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    setElementValue(element: Element, newValue: any): FormFieldTypeElementStatus {
        if (!FormFieldType.isFormElement(element)) {
            return FormFieldTypeElementStatus.INVALID_ELEMENT;
        }
        if (element.type !== this.asElementType()) {
            return FormFieldTypeElementStatus.TYPE_MISMATCH;
        }
        element.value = newValue;
        return FormFieldTypeElementStatus.VALUE_SET_SUCCESS;
    }

    getElementMetaValue(element: Element, metaKey: string): [any, FormFieldTypeElementStatus] {
        if (!FormFieldType.isFormElement(element)) {
            return [undefined, FormFieldTypeElementStatus.INVALID_ELEMENT];
        }
        if (element.type !== this.asElementType()) {
            return [undefined, FormFieldTypeElementStatus.TYPE_MISMATCH];
        }
        if (metaKey === "disabled") {
            return [element.disabled, FormFieldTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, FormFieldTypeElementStatus.META_KEY_NOT_EXISTS]
    }

    setElementMetaValue(element: Element, metaKey: string, newValue: any): FormFieldTypeElementStatus {
        if (!FormFieldType.isFormElement(element)) {
            return FormFieldTypeElementStatus.INVALID_ELEMENT;
        }
        if (element.type !== this.asElementType()) {
            return FormFieldTypeElementStatus.TYPE_MISMATCH;
        }
        if (metaKey === "disabled") {
            element.disabled = Boolean(newValue);
            return FormFieldTypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return FormFieldTypeElementStatus.META_KEY_NOT_EXISTS;
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

    override getFieldValue(field: FormField): any {
        return field.getMetaValue("checked") ? field.getValue() : null;
    }

    override setFieldValue(field: FormField, newValue: any): any {
        return field.setMetaValue("checked", newValue != null && field.getValue() === newValue);
    }

    override getElementMetaValue(element: HTMLInputElement, metaKey: string): [any, FormFieldTypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== FormFieldTypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "checked") {
            return [element.checked, FormFieldTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, FormFieldTypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementMetaValue(element: HTMLInputElement, metaKey: string, newValue: any): FormFieldTypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== FormFieldTypeElementStatus.META_KEY_NOT_EXISTS) return status;
        if (metaKey === "checked") {
            element.checked = Boolean(newValue);
            return FormFieldTypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return FormFieldTypeElementStatus.FAILED_TO_SET_META_VALUE;
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

    override getFieldValue(field: FormField): any {
        const value = field.getValue();
        if (["", "on"].includes(value)) return field.getMetaValue("checked");
        return field.getMetaValue("checked") ? value : null;
    }

    override setFieldValue(field: FormField, newValue: any): any {
        if (["", "on"].includes(field.getValue())) return field.setMetaValue("checked", newValue);
        return field.setMetaValue("checked", newValue != null && field.getValue() === newValue);
    }

    override getElementMetaValue(element: HTMLInputElement, metaKey: string): [any, FormFieldTypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== FormFieldTypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "checked") {
            return [element.checked, FormFieldTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, FormFieldTypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementMetaValue(element: HTMLInputElement, metaKey: string, newValue: any): FormFieldTypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== FormFieldTypeElementStatus.META_KEY_NOT_EXISTS) return status;
        if (metaKey === "checked") {
            element.checked = Boolean(newValue);
            return FormFieldTypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return FormFieldTypeElementStatus.FAILED_TO_SET_META_VALUE;
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

    override getElementValue(element: HTMLSelectElement): [any, FormFieldTypeElementStatus] {
        if (!FormFieldType.isFormElement(element)) {
            return [undefined, FormFieldTypeElementStatus.INVALID_ELEMENT];
        }
        if (element.type !== this.asElementType()) {
            return [undefined, FormFieldTypeElementStatus.TYPE_MISMATCH];
        }
        if (this._multiple) {
            return [Array.from(element.selectedOptions, option => option.value), FormFieldTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [element.value, FormFieldTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    override setElementValue(element: HTMLSelectElement, newValue: any): FormFieldTypeElementStatus {
        if (!FormFieldType.isFormElement(element)) {
            return FormFieldTypeElementStatus.INVALID_ELEMENT;
        }
        if (element.type !== this.asElementType()) {
            return FormFieldTypeElementStatus.TYPE_MISMATCH;
        }
        let options: (HTMLOptionElement | null)[];
        if (this._multiple) {
            options = newValue.map((value: any): HTMLOptionElement | null => {
                return element.querySelector(`option[value="${value}"]`);
            });
        } else {
            options = [
                element.querySelector(`option[value="${newValue}"]`)
            ]
        }
        if (options.some(option => option == null)) return FormFieldTypeElementStatus.FAILED_TO_SET_VALUE;
        (options as HTMLOptionElement[]).forEach(option => {
            option.selected = true;
        });
        return FormFieldTypeElementStatus.VALUE_SET_SUCCESS;
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

    processChanges(field: FormField, type: FormFieldChangeType | null = null, dryRun: boolean = false): Set<string> {
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
            return this.processChanges(FormFieldChangeType.Value, !processChanges);
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
        return this.type.setFieldMetaValue(this.getAdapter({ stateKey, raw: true, initiator, processChanges }), metaKey, newValue);
    }

    processChanges(type: FormFieldChangeType | null = null, dryRun: boolean = false): Set<string> {
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

    processChanges(type: FormFieldChangeType | null = null, dryRun: boolean = false): Set<string> {
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
        this.field.setInitialMetaValue("container", this.element.parentElement);
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
        const changes = (event as FormFieldChangesEvent).changes.filter(change => change.initiator !== this);
        for (const change of changes) {
            if (change.type === FormFieldChangeType.Value) {
                this._syncElementValue();
            } else if (change.type === FormFieldChangeType.MetaValue) {
                this._syncElementMetaValue(change.metaKey);
            }
        }
    }

    _syncElementValue(): void {
        console.log("[FormFieldElementLinker._syncElementValue] Syncing element value");
        const value = this.field.getValue({ raw: true });
        const status = this.type.setElementValue(this.element, value);
        if (status !== FormFieldTypeElementStatus.VALUE_SET_SUCCESS) {
            console.log("[FormFieldElementLinker._syncElementMetaValue] Failed to set element value, status `%s`", status);
            return;
        }
    }

    _getElementValue(): any {
        const [value, status] = this.type.getElementValue(this.element);
        if (status !== FormFieldTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED) {
            console.warn("[FormFieldElementLinker._getElementValue] Failed to get value from element, status `%s`", status);
        }
        return value;
    }

    _syncFieldValue(): void {
        console.log("[FormFieldElementLinker._syncFieldValue] Syncing field value");
        this.field.setValue(this._getElementValue(), { initiator: this, processChanges: true, raw: true });
    }

    _syncElementMetaValue(metaKey: string): void {
        console.log("[FormFieldElementLinker._syncElementMetaValue] Syncing element meta value");
        const value = this.field.getMetaValue(metaKey, { raw: true });
        const status = this.type.setElementMetaValue(this.element, metaKey, value);
        if (status === FormFieldTypeElementStatus.META_VALUE_SET_SUCCESS) {
            return;
        }
        if (status === FormFieldTypeElementStatus.META_KEY_NOT_EXISTS) {
            switch (metaKey) {
                case "visible":
                    const container = this.field.getMetaValue("container") as HTMLElement;
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
            return;
        }

        console.log("[FormFieldElementLinker._syncElementMetaValue] Failed to set element meta value, status `%s`", status);
    }

    _getElementMetaValue(metaKey: string): any {
        const [value, status] = this.type.getElementMetaValue(this.element, metaKey);
        if (status !== FormFieldTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED) {
            console.warn("[FormFieldElementLinker._getElementMetaValue] Failed to get value from element, status `%s`", status);
        }
        return value;
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
        const changes = (event as FormFieldChangesEvent).changes;
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