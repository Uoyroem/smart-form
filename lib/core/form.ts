import { EffectManager } from "./effect-manager";
export { EffectManager };

export function isVisible(element: HTMLElement) {
    const style = getComputedStyle(element);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (parseFloat(style.opacity) < 0.1) return false;
    if (element.offsetWidth + element.offsetHeight + element.getBoundingClientRect().height +
        element.getBoundingClientRect().width === 0) {
        return false;
    }
    const elementCenter = {
        x: element.getBoundingClientRect().left + element.offsetWidth / 2,
        y: element.getBoundingClientRect().top + element.offsetHeight / 2
    };
    if (elementCenter.x < 0) return false;
    if (elementCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elementCenter.y < 0) return false;
    if (elementCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
    let pointContainer: Element | ParentNode | null | undefined = document.elementFromPoint(elementCenter.x, elementCenter.y);
    do {
        if (pointContainer === element) return true;
    } while (pointContainer = pointContainer?.parentNode);
    return false;
}

export function deepEqual(a: any, b: any): boolean {
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

export function readFile(file: File) {
    return new Promise((resolve, reason) => {
        const reader = new FileReader();
        reader.onload = function () {
            const content = (reader.result as string | null)?.split(',')?.[1];
            if (content) {
                resolve(content);
            }
        };
        reader.readAsDataURL(file);
    });
}

export function getMetaDependencyKey(fieldName: string, metaKey: string) {
    return `${fieldName}:${metaKey}`;
}

export type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export enum FormTypeElementStatus {
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

interface FormPrimitiveType { }
interface FormElementType { }

export class FormType {
    static object() {
        return new FormTypeObject();
    }

    static boolean() {
        return new FormTypeBoolean();
    }

    static text() {
        return new FormTypeText();
    }

    static file({ multiple = false } = {}) {
        return new FormTypeFile().multiple(multiple);
    }

    static number() {
        return new FormTypeNumber();
    }

    static date() {
        return new FormTypeDate();
    }

    static month() {
        return new FormTypeMonth();
    }

    static select({ multiple = false } = {}) {
        return new FormTypeSelect().multiple(multiple);
    }

    static checkbox() {
        return new FormTypeCheckbox();
    }

    static radio() {
        return new FormTypeRadio();
    }

    static isFormElement(element: Element): element is FormElement {
        return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
    }

    static fromFormElement(element: FormElement): FormType {
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
            case "month":
                return this.month();
            case "file":
                return this.file({ multiple: (element as HTMLInputElement).multiple });
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

    getElementValue(element: Element): [any, FormTypeElementStatus] {
        if (!FormType.isFormElement(element)) {
            return [null, FormTypeElementStatus.INVALID_ELEMENT];
        }
        if (element.type !== this.asElementType()) {
            return [null, FormTypeElementStatus.TYPE_MISMATCH];
        }
        return [element.value, FormTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    setElementValue(element: Element, newValue: any): FormTypeElementStatus {
        if (!FormType.isFormElement(element)) {
            return FormTypeElementStatus.INVALID_ELEMENT;
        }
        if (element.type !== this.asElementType()) {
            return FormTypeElementStatus.TYPE_MISMATCH;
        }
        element.value = newValue;
        return FormTypeElementStatus.VALUE_SET_SUCCESS;
    }

    getElementMetaValue(element: Element, metaKey: string): [any, FormTypeElementStatus] {
        if (!FormType.isFormElement(element)) {
            return [undefined, FormTypeElementStatus.INVALID_ELEMENT];
        }
        if (element.type !== this.asElementType()) {
            return [undefined, FormTypeElementStatus.TYPE_MISMATCH];
        }
        if (metaKey === "disabled") {
            return [element.disabled, FormTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, FormTypeElementStatus.META_KEY_NOT_EXISTS]
    }

    setElementMetaValue(element: Element, metaKey: string, newValue: any): FormTypeElementStatus {
        if (!FormType.isFormElement(element)) {
            return FormTypeElementStatus.INVALID_ELEMENT;
        }
        if (element.type !== this.asElementType()) {
            return FormTypeElementStatus.TYPE_MISMATCH;
        }
        if (metaKey === "disabled") {
            element.disabled = Boolean(newValue);
        } else if (metaKey === "autofill") {
            element.classList.toggle("autofill", Boolean(newValue));
        } else {
            return FormTypeElementStatus.META_KEY_NOT_EXISTS;
        }
        return FormTypeElementStatus.META_VALUE_SET_SUCCESS;
    }

    getInitialValue(): any {
        return null;
    }

    getInitialMeta(): Map<string, InitialMetaItem> {
        const meta = new Map();
        meta.set("disabled", { value: false, resettable: false });
        meta.set("dirty", { value: false, resettable: true });
        return meta;
    }

    isSameType(otherType: FormType): boolean {
        return this.name === otherType.name;
    }
}

export class FormTypeFile extends FormType implements FormElementType {
    private _multiple: boolean = false;

    constructor() {
        super("File");
    }

    multiple(value: boolean = true): this {
        this._multiple = value;
        return this;
    }

    asElementType(): string {
        return "file";
    }

    override getElementValue(element: HTMLInputElement): [any, FormTypeElementStatus] {
        if (!FormType.isFormElement(element)) {
            return [undefined, FormTypeElementStatus.INVALID_ELEMENT];
        }
        if (element.type !== this.asElementType()) {
            return [undefined, FormTypeElementStatus.TYPE_MISMATCH];
        }
        if (this._multiple) {
            return [element.files && Array.from(element.files), FormTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [element.files && element.files[0], FormTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    override setElementValue(element: HTMLInputElement, newValue: any): FormTypeElementStatus {
        if (!FormType.isFormElement(element)) {
            return FormTypeElementStatus.INVALID_ELEMENT;
        }
        if (element.type !== this.asElementType()) {
            return FormTypeElementStatus.TYPE_MISMATCH;
        }
        const dataTransfer = new DataTransfer();
        if (this._multiple) {
            for (const file of newValue) {
                dataTransfer.items.add(file);
            }
        } else {
            dataTransfer.items.add(newValue);
        }
        element.files = dataTransfer.files;
        return FormTypeElementStatus.VALUE_SET_SUCCESS;
    }
}

export class FormTypeText extends FormType implements FormPrimitiveType, FormElementType {
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

export class FormTypeNumber extends FormType implements FormPrimitiveType, FormElementType {
    constructor() {
        super("Number");
    }

    asElementType(): string {
        return "number";
    }
}

export class FormTypeDate extends FormType implements FormPrimitiveType, FormElementType {
    constructor() {
        super("Date");
    }

    asElementType(): string {
        return "date";
    }

    isEqual(a: any, b: any): boolean {
        return a === b;
    }
}

export class FormTypeMonth extends FormType implements FormPrimitiveType, FormElementType {
    constructor() {
        super("Month");
    }

    asElementType(): string {
        return "month";
    }

    isEqual(a: any, b: any): boolean {
        return a === b;
    }
}

export class FormTypeBoolean extends FormType implements FormPrimitiveType, FormElementType {
    constructor() {
        super("Boolean");
    }
}

export class FormTypeRadio extends FormType implements FormElementType {
    constructor() {
        super("Radio");
    }

    asElementType(): string {
        return "radio";
    }

    getInitialMeta(): Map<string, InitialMetaItem> {
        const meta = super.getInitialMeta();
        meta.set("checked", { value: false, resettable: true });
        return meta;
    }

    override getFieldValue(field: FormField): any {
        return field.getMetaValue("checked") ? field.getValue() : null;
    }

    override setFieldValue(field: FormField, newValue: any): any {
        return field.setMetaValue("checked", newValue != null && field.getValue() === newValue);
    }

    override getElementMetaValue(element: HTMLInputElement, metaKey: string): [any, FormTypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== FormTypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "checked") {
            return [element.checked, FormTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, FormTypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementMetaValue(element: HTMLInputElement, metaKey: string, newValue: any): FormTypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== FormTypeElementStatus.META_KEY_NOT_EXISTS) return status;
        if (metaKey === "checked") {
            element.checked = Boolean(newValue);
            return FormTypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return FormTypeElementStatus.META_KEY_NOT_EXISTS;
    }
}

export class FormTypeCheckbox extends FormType implements FormElementType {
    constructor() {
        super("Checkbox");
    }

    asElementType(): string {
        return "checkbox";
    }

    getInitialMeta(): Map<string, InitialMetaItem> {
        const meta = super.getInitialMeta();
        meta.set("checked", { value: false, resettable: true });
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

    override getElementMetaValue(element: HTMLInputElement, metaKey: string): [any, FormTypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== FormTypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "checked") {
            return [element.checked, FormTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, FormTypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementMetaValue(element: HTMLInputElement, metaKey: string, newValue: any): FormTypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== FormTypeElementStatus.META_KEY_NOT_EXISTS) return status;
        if (metaKey === "checked") {
            element.checked = Boolean(newValue);
            return FormTypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return FormTypeElementStatus.META_KEY_NOT_EXISTS;
    }
}

export class FormTypeSelect extends FormType implements FormElementType {
    private _multiple: boolean;
    private _of: FormType;

    constructor() {
        super("select");
        this._multiple = false;
        /**
         * @type {FormType}
         */
        this._of = FormType.text();
    }

    asElementType(): string {
        return this._multiple ? "select-multiple" : "select-one";
    }

    getInitialMeta(): Map<string, InitialMetaItem> {
        const meta = super.getInitialMeta();
        meta.set("options", { value: [], resettable: false });
        return meta;
    }

    multiple(value: boolean = true): this {
        this._multiple = value;
        return this;
    }

    of(type: FormType): this {
        this._of = type;
        return this;
    }

    override getFieldValue(field: FormField): any {
        const value = field.getValue();
        const options = field.getMetaValue("options") as SelectOption[];
        const optionValues = options.map(option => option.value);

        if (this._multiple) {
            return value.filter((value: any) => optionValues.some(optionValue => optionValue == value));
        } else {
            return optionValues.some(optionValue => optionValue == value) ? value : options.find((option) => option.selected)?.value ?? options.find(option => !option.disabled)?.value ?? null;
        }
    }

    override getElementValue(element: HTMLSelectElement): [any, FormTypeElementStatus] {
        if (!FormType.isFormElement(element)) {
            return [undefined, FormTypeElementStatus.INVALID_ELEMENT];
        }
        if (element.type !== this.asElementType()) {
            return [undefined, FormTypeElementStatus.TYPE_MISMATCH];
        }
        if (this._multiple) {
            return [Array.from(element.selectedOptions, option => option.value), FormTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [element.value, FormTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    override getElementMetaValue(element: HTMLSelectElement, metaKey: string): [any, FormTypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== FormTypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "options") {
            return [Array.from(element.options, option => ({ value: option.value || option.textContent, disabled: option.disabled, selected: option.selected, textContent: option.textContent })), FormTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, FormTypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementValue(element: HTMLSelectElement, newValue: any): FormTypeElementStatus {
        if (!FormType.isFormElement(element)) {
            return FormTypeElementStatus.INVALID_ELEMENT;
        }
        if (element.type !== this.asElementType()) {
            return FormTypeElementStatus.TYPE_MISMATCH;
        }
        Array.from(element.selectedOptions).forEach(option => {
            option.selected = false;
        });
        (this._multiple ? newValue as any[] : [newValue]).map((value: any): HTMLOptionElement | null => {
            return element.querySelector(`option[value="${value}"]`);
        }).filter(option => option != null).forEach(option => {
            option.selected = true;
        });
        return FormTypeElementStatus.VALUE_SET_SUCCESS;
    }

    override setElementMetaValue(element: HTMLSelectElement, metaKey: string, newValue: any): FormTypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== FormTypeElementStatus.META_KEY_NOT_EXISTS) return status;
        if (metaKey === "options") {
            element.innerHTML = "";
            for (const option of newValue) {
                const optionElement = document.createElement("option");
                optionElement.value = option.value;
                optionElement.selected = option.selected;
                optionElement.disabled = option.disabled;
                optionElement.textContent = option.textContent;
                element.options.add(optionElement);
            }
            return FormTypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return FormTypeElementStatus.META_KEY_NOT_EXISTS;
    }
}

export class FormTypeObject extends FormType implements FormPrimitiveType {
    constructor() {
        super("Object");
    }

    isEqual(a: any, b: any): boolean {
        return deepEqual(a, b);
    }
}

export enum FormFieldChangeType {
    Value = "value",
    MetaValue = "meta-value"
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

export interface InitialMetaItem {
    value: any;
    resettable: boolean;
}

export class FormField extends EventTarget {
    private _name: string;
    private _type: FormType;
    private _changeSet: FormFieldChangeSet;
    private _initializedStateKeys: Set<string>;
    private _initialValue: any;
    private _valueMap: Map<string, any>;
    private _initialMeta: Map<string, InitialMetaItem>;
    private _metaMap: Map<string, Map<string, any>>;
    private _currentStateKey: string;

    constructor(name: string, type: FormType, { changeSet = null, effectManager = null }: { changeSet?: FormFieldChangeSet | null, effectManager?: EffectManager | null } = {}) {
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

    get type(): FormType {
        return this._type;
    }

    clearInitialMeta(): void {
        this._initialMeta = new Map();
    }

    reset({ stateKey = null, initiator = null, processChanges = false, full = false }: FormFieldContext & { full?: boolean } = {}): Set<string> {
        stateKey ??= this._currentStateKey;
        console.log("[FormField.reset] Reset state `%s` for field `%s`", stateKey, this.name);
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

    initializeState({ stateKey, initiator = null }: FormFieldContext & { stateKey: string }): void {
        if (!this._initializedStateKeys.has(stateKey)) {
            console.log("[FormField.initializeState] Initializing state key `%s` for field `%s`", stateKey, this.name);
            this._initializedStateKeys.add(stateKey);
            this.reset({ stateKey, initiator, processChanges: true, full: true });
        }
    }

    switchState({ stateKey, initiator = null, processChanges = false }: FormFieldContext & { stateKey: string }): Set<string> {
        console.log("[FormField.switchState] Switching state for field `%s` from `%s` to `%s`", this.name, this._currentStateKey, stateKey);
        this.initializeState({ stateKey, initiator });
        for (const [metaKey, newValue] of this._metaMap.get(stateKey)!.entries()) {
            const oldValue = this._metaMap.get(this._currentStateKey)!.get(metaKey);
            if (!deepEqual(oldValue, newValue)) {
                console.log("[FormField.switchState] Field meta value %s has change between stages", getMetaDependencyKey(this.name, metaKey));
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
        const oldValue = this._valueMap.get(this._currentStateKey);
        const newValue = this._valueMap.get(stateKey);
        if (!this.type.isEqual(oldValue, newValue)) {
            console.log("[FormField.switchState] Field value %s has change between stages", this.name)
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
        if (!raw) {
            if (disabledIsNull && this.getMetaValue("disabled", { stateKey })) {
                return null;
            }
            return this.type.getFieldValue(this.getAdapter({ stateKey, raw: true }));
        }

        stateKey ??= this._currentStateKey
        this.initializeState({ stateKey });
        return this._valueMap.get(stateKey);
    }

    setInitialValue(newValue: any): void {
        this._initialValue = newValue;
    }

    setValue(newValue: any, { stateKey = null, raw = false, initiator = null, processChanges = false }: FormFieldContext = {}): Set<string> {
        if (!raw) {
            return this.type.setFieldValue(this.getAdapter({ stateKey, raw: true, processChanges, initiator }), newValue);
        }
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

    getMetaValue(metaKey: string, { stateKey = null, raw = false }: FormFieldContext = {}): any {
        if (!raw) {
            return this.type.getFieldMetaValue(this.getAdapter({ raw: true, stateKey }), metaKey);
        }
        stateKey ??= this._currentStateKey
        this.initializeState({ stateKey });
        const meta = this._metaMap.get(stateKey);
        return meta!.get(metaKey);
    }

    setInitialMetaValue(metaKey: string, newValue: any, { resettable = true }: { resettable?: boolean } = {}): void {
        this._initialMeta.set(metaKey, { value: newValue, resettable });
    }

    setMetaValue(metaKey: string, newValue: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FormFieldContext = {}): Set<string> {
        if (!raw) {
            return this.type.setFieldMetaValue(this.getAdapter({ stateKey, raw: true, initiator, processChanges }), metaKey, newValue);
        }
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

    processChanges(type: FormFieldChangeType | null = null, dryRun: boolean = false): Set<string> {
        return this.changeSet.processChanges(this, type, dryRun);
    }
}

export class ContextFormField {
    constructor(public readonly field: FormField, public readonly context: FormFieldContext) { }
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
    public type: FormType;

    constructor(field: FormField) {
        this.field = field;
        this.type = field.type;
    }

    abstract link(): void;
    abstract unlink(): void;
}

export class FormFieldElementLinker extends FormFieldLinker {
    public element: FormElement;
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
    }

    override link(): void {
        this.field.setInitialValue(this._getElementValue());
        this.field.setInitialMetaValue("disabled", this._getElementMetaValue("disabled"), { resettable: false });
        this.field.setInitialMetaValue("container", this.element.parentElement, { resettable: false });
        if (["radio", "checkbox"].includes(this.type.asElementType())) {
            this.field.setInitialMetaValue("checked", this._getElementMetaValue("checked"));
        }
        if (["select-one", "select-multiple"].includes(this.type.asElementType())) {
            this.field.setInitialMetaValue("options", this._getElementMetaValue("options"), { resettable: false })
        }
        this.field.reset({ processChanges: true, initiator: this, full: true });

        this.field.addEventListener("changes", this._fieldChangesEventListener);
        if (["text", "number", "textarea"].includes(this.type.asElementType())) {
            this.element.addEventListener("input", this._elementValueInputEventListener);
        } else {
            this.element.addEventListener("change", this._elementValueChangeEventListener);
        }
    }

    override unlink(): void {
        this.field.removeEventListener("changes", this._fieldChangesEventListener);
        if (["text", "number", "textarea"].includes(this.type.asElementType())) {
            this.element.removeEventListener("input", this._elementValueInputEventListener);
        } else {
            this.element.removeEventListener("change", this._elementValueChangeEventListener);
        }
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
        if (status !== FormTypeElementStatus.VALUE_SET_SUCCESS) {
            console.log("[FormFieldElementLinker._syncElementMetaValue] Failed to set element value, status `%s`", status);
            return;
        }
    }

    _getElementValue(): any {
        const [value, status] = this.type.getElementValue(this.element);
        if (status !== FormTypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED) {
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
        if (status === FormTypeElementStatus.META_VALUE_SET_SUCCESS) {
            switch (metaKey) {
                case "options":
                    if (value.length !== 0) {
                        this._syncElementValue();
                    }
            }
            return;
        }
        if (status === FormTypeElementStatus.META_KEY_NOT_EXISTS) {
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
                        if (isVisible(container)) {
                            if (container.style.display !== "none") {
                                this._handleHideContainer = (event: Event) => {
                                    container.style.display = "none";
                                };
                                container.addEventListener("transitionend", this._handleHideContainer, { once: true });
                            }
                        } else {
                            container.style.display = "none";
                        }
                        container.dataset.visible = "false";
                    }
                    break;

                case "options":
                    if (value.length !== 0) {
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
        if (status !== FormTypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED) {
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

export interface SelectOption {
    value: string;
    textContent: string;
    disabled?: boolean;
    selected?: boolean;
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

// export class FormData {
//     constructor(public readonly form: Form) {
//         const formData = []
//         for (const field of form.fields.list) {
//             formData, field.getValue({ raw: true });
//         }
//     }

//     get(name: string): any {

//     }

//     getAll(name: string): any[] {

//     }
// }

interface FocusActionClickElement {
    type: "click";
    element: HTMLElement;
}

interface FocusActionCallback {
    type: "callback";
    callback: () => void;
}

type FocusAction = FocusActionClickElement | FocusActionCallback;

export class Form extends EventTarget {
    public form: HTMLFormElement;
    public effectManager: EffectManager;
    public fields: FormFields;
    public fieldLinkers: FormFieldLinker[];
    public changeSet: FormFieldChangeSet;
    public focusActions: FocusAction[];
    private _changesManagers: FormChangesManager[];

    constructor({ form, focusActions }: { form: HTMLFormElement, focusActions?: FocusAction[] }) {
        super();
        this.form = form;
        this.changeSet = new FormFieldChangeSet();
        this.effectManager = new EffectManager();
        this.fields = new FormFields();
        this.fieldLinkers = [];
        this.focusActions = focusActions ?? [];
        this._changesManagers = [];
        this._handleChanges = this._handleChanges.bind(this);
    }

    async setup() {
        if (this.form != null) {
            this.form.classList.add("ss-form");
            this.form.addEventListener("submit", (event) => {
                event.preventDefault();
                this.submit();
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

    async focus() {
        for (const focusAction of this.focusActions) {
            switch (focusAction.type) {
                case "click":
                    focusAction.element.click();
                    break;
                case "callback":
                    focusAction.callback();
                    break;
                default:
                    break;
            }
        }
    }

    _handleChanges(event: Event) {
        const changes = (event as FormFieldChangesEvent).changes;
        for (const changesManager of this._changesManagers) {
            changesManager.manage(this, changes);
        }
    }

    switchState(stateKey: string) {
        for (const field of this.fields.list) {
            field.switchState({ stateKey, initiator: this, processChanges: true });
        }
        this.effectManager.triggerEffects();
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

    updateFormData(formData: Record<string, any>) {
        for (const fieldName of this.fields) {
            if (!(fieldName in formData)) continue;
            this.fields.get(fieldName).setValue(formData[fieldName], { initiator: this, processChanges: true });
        }
        this.effectManager.triggerEffects();
    }

    registerElements(): void {
        for (const element of this.form.elements) {
            if (!FormType.isFormElement(element)) {
                continue;
            }
            if (element.name === "") continue;
            const field = new FormField(element.name, FormType.fromFormElement(element), { changeSet: this.changeSet, effectManager: this.effectManager });
            const fieldElementLinker = new FormFieldElementLinker(field, element);
            fieldElementLinker.link();
            this.fieldLinkers.push(fieldElementLinker);
            this.fields.add(field);
        }
    }

    getElement(name: string): Element | RadioNodeList | null {
        return this.form.elements.namedItem(name);
    }

    async submit(): Promise<void> {

    }

    reset(): void {
        for (const field of this.fields.list) {
            field.reset({ initiator: this, processChanges: true });
        }
        this.effectManager.triggerEffects();
    }

    addField(fieldName: string, type: FormType): void {
        this.fields.add(new FormField(fieldName, type, { changeSet: this.changeSet, effectManager: this.effectManager }));
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
                    return field.setMetaValue("disabled", disabled, { processChanges: true });
                },
            },
            dependsOn,
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
                    return field.setMetaValue("visible", visible, { processChanges: true });
                },
            },
            dependsOn: [getMetaDependencyKey(fieldName, "disabled")]
        });
    }

    addComputedFieldEffect(fieldName: string, fieldType: FormType, compute: () => Promise<any> | any, dependsOn: string[]): void {
        this.addField(fieldName, fieldType);
        this.effectManager.registerNode({
            key: fieldName,
            value: {
                type: "computed-field",
                callback: async () => {
                    const value = await compute();
                    const field = this.fields.get(fieldName);
                    return field.setValue(value, { initiator: this, processChanges: true });
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
            },
            dependsOn: [getMetaDependencyKey(fieldName, "dirty"), ...dependsOn]
        });
    }

    addSelectOptionsInitializerEffect(fieldName: string, getDefaultOption: () => Promise<SelectOption> | SelectOption, getOptions: () => Promise<SelectOption[]> | SelectOption[], dependsOn: string[]): void {
        this.effectManager.addDependency(getMetaDependencyKey(fieldName, "disabled"), getMetaDependencyKey(fieldName, "options"));
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "options"),
            value: {
                type: "select-options-initializer",
                callback: async () => {
                    const defaultOption = await getDefaultOption();
                    const options = await getOptions();
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    const selectedValue = field.getValue({ disabledIsNull: false, raw: true });
                    field.setValue(selectedValue);
                    field.setMetaValue("disabled", options.length === 0);
                    field.setMetaValue("options", [defaultOption, ...options]);
                    return field.processChanges();
                },
            },
            dependsOn
        });
    }
}