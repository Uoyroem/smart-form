import { EffectManager } from "./effect-manager";
import IMask from "imask";
import log from "loglevel";
export { EffectManager };

const logger = log.getLogger("smart-system:form");
if (process.env.NODE_ENV === "production") {
    logger.setLevel("silent");
}

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

export interface JsonFile {
    name: string;
    type: string;
    content: string;
}

export async function fileToJson(file: File): Promise<JsonFile> {
    return new Promise((resolve, reason) => {
        const reader = new FileReader();
        reader.onload = function () {
            const content = (reader.result as string | null)?.split(',')?.[1];
            if (content) {
                resolve({ name: file.name, type: file.type, content });
            }
        };
        reader.readAsDataURL(file);
    });
}

export function jsonToFile(json: JsonFile): File {
    const binaryString = atob(json.content);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: json.type });
    return new File([blob], json.name, { type: json.type });
}

export function getMetaDependencyKey(fieldName: string, metaKey: string) {
    return `${fieldName}:${metaKey}`;
}

export enum TypeElementStatus {
    VALUE_SUCCESSFULLY_RECEIVED = "value-successfully-received",
    PROMISE = "promise",
    VALUE_SET_SUCCESS = "value-set-success",
    META_VALUE_SUCCESSFULLY_RECEIVED = "meta-value-successfully-received",
    META_VALUE_SET_SUCCESS = "meta-value-set-success",
    FAILED_TO_SET_VALUE = "failed-to-set-value",
    FAILED_TO_SET_META_VALUE = "failed-to-set-meta-value",
    INVALID_ELEMENT = "invalid-element",
    TYPE_MISMATCH = "type-mismatch",
    META_KEY_NOT_EXISTS = "meta-key-not-exists"
}

interface PrimitiveType { }
interface ElementType { }
interface ElementMaskableType {
    _masked: boolean;
    mask(element: any): any;
    masked(value: boolean): this;
}

export class Type {
    static object() {
        return new ObjectType();
    }

    static boolean() {
        return new BooleanType();
    }

    static text() {
        return new TextType();
    }

    static file({ multiple = false } = {}) {
        return new FileType().multiple(multiple);
    }

    static number({ precision = 2, min, max, masked = false }: { masked?: boolean, min?: number, max?: number, precision?: number } = {}) {
        return new NumberType().masked(masked).min(min).max(max).precision(precision);
    }

    static date() {
        return new DateType();
    }

    static month() {
        return new MonthType();
    }

    static select({ multiple = false } = {}) {
        return new SelectType().multiple(multiple);
    }

    static checkbox() {
        return new CheckboxType();
    }

    static radio() {
        return new RadioType();
    }

    static fromElement(element: any): Type {
        switch (element.type) {
            case "select-one":
                return this.select();
            case "select-multiple":
                return this.select().multiple();
            case "number":
                let min = parseFloat(element.min);
                let max = parseFloat(element.max);
                let masked = element.dataset.masked === "true";
                return this.number({
                    min: Number.isNaN(min) ? -Infinity : min,
                    max: Number.isNaN(max) ? Infinity : max,
                    masked
                });
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
                return this.file({ multiple: element.multiple });
            default:
                throw new Error(`As element type ${element} not has`);
        }
    }

    constructor(public readonly name: string) {
        this.name = name;
    }

    isValuesEqual(a: any, b: any): boolean { return a === b; }
    asElementType() { return "hidden"; }
    wrap(element: any): any { return element; }

    getFieldValue(field: Field): any {
        return field.getValue();
    }

    getFieldMetaValue(field: Field, metaKey: string): any {
        return field.getMetaValue(metaKey);
    }

    setFieldValue(field: Field, newValue: any): Set<string> {
        return field.setValue(newValue);
    }

    setFieldMetaValue(field: Field, metaKey: string, newValue: any): Set<string> {
        return field.setMetaValue(metaKey, newValue);
    }

    getElementValue(element: any): [any, TypeElementStatus] {
        return [element.value, TypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    setElementValue(element: any, newValue: any): TypeElementStatus {
        element.value = newValue;
        return TypeElementStatus.VALUE_SET_SUCCESS;
    }

    getElementMetaValue(element: any, metaKey: string): [any, TypeElementStatus] {
        if (metaKey === "disabled") {
            return [element.disabled, TypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, TypeElementStatus.META_KEY_NOT_EXISTS]
    }

    setElementMetaValue(element: any, metaKey: string, newValue: any): TypeElementStatus {
        if (metaKey === "disabled") {
            element.disabled = Boolean(newValue);
        } else if (metaKey === "autofill") {
            element.classList.toggle("autofill", Boolean(newValue));
        } else {
            return TypeElementStatus.META_KEY_NOT_EXISTS;
        }
        return TypeElementStatus.META_VALUE_SET_SUCCESS;
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

    isSameType(otherType: Type): boolean {
        return this.name === otherType.name;
    }
}

export class FileType extends Type implements ElementType {
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

    override getElementValue(element: HTMLInputElement): [any, TypeElementStatus] {
        if (this._multiple) {
            return [element.files!.length === 0 ? [] : Promise.all(Array.from(element.files!, file => fileToJson(file))).then(jsonFiles => jsonFiles), TypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [element.files!.length === 0 ? null : fileToJson(element.files![0]).then(jsonFile => jsonFile), TypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    override setElementValue(element: HTMLInputElement, newValue: any): TypeElementStatus {
        const dataTransfer = new DataTransfer();
        if (this._multiple) {
            for (const file of newValue) {
                dataTransfer.items.add(jsonToFile(file));
            }
        } else {
            dataTransfer.items.add(jsonToFile(newValue));
        }
        element.files = dataTransfer.files;
        return TypeElementStatus.VALUE_SET_SUCCESS;
    }
}

export class TextType extends Type implements PrimitiveType, ElementType {
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

export class NumberType extends Type implements ElementMaskableType, PrimitiveType, ElementType {
    private _precision: number = 2;
    private _min?: number;
    private _max?: number;
    _masked: boolean = false;

    constructor() {
        super("Number");
    }

    asElementType(): string {
        return this._masked ? "text" : "number";
    }

    wrap(element: any): any {
        return this._masked ? this.mask(element) : element;
    }

    mask(element: any): any {
        element.type = "text";
        const mask = IMask(element, {
            mask: Number,
            scale: this._precision,
            thousandsSeparator: ' ',
            normalizeZeros: true,
            min: this._min,
            max: this._max,
            autofix: true
        });
        return new Proxy(element, {
            get(target, propertyKey, receiver) {
                if (propertyKey === 'value') {
                    return mask.unmaskedValue; // Перехват геттера
                }
                const value = target[propertyKey];
                if (value instanceof Function) {
                    return function (this: any, ...args: any) {
                        return value.apply(this === receiver ? target : this, args);
                    };
                }
                return value;
            },
            set(target, propertyKey, newValue, receiver) {
                switch (propertyKey) {
                    case "value":
                        mask.unmaskedValue = `${newValue ?? ""}`;
                        return true;
                    default:
                        element[propertyKey] = newValue;
                        return true;
                }
            },
        });
    }

    masked(value: boolean): this {
        this._masked = value;
        return this;
    }

    min(value?: number): this {
        this._min = value;
        return this;
    }

    max(value?: number): this {
        this._max = value;
        return this;
    }

    precision(value: number = 2): this {
        this._precision = value;
        return this;
    }
}

export class DateType extends Type implements PrimitiveType, ElementType {
    constructor() {
        super("Date");
    }

    asElementType(): string {
        return "date";
    }

    isValuesEqual(a: any, b: any): boolean {
        return a === b;
    }
}

export class MonthType extends Type implements PrimitiveType, ElementType {
    constructor() {
        super("Month");
    }

    asElementType(): string {
        return "month";
    }

    isValuesEqual(a: any, b: any): boolean {
        return a === b;
    }
}

export class BooleanType extends Type implements PrimitiveType, ElementType {
    constructor() {
        super("Boolean");
    }
}

export class RadioType extends Type implements ElementType {
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

    override getFieldValue(field: Field): any {
        return field.getMetaValue("checked") ? field.getValue() : null;
    }

    override setFieldValue(field: Field, newValue: any): any {
        return field.setMetaValue("checked", newValue != null && field.getValue() === newValue);
    }

    override getElementMetaValue(element: HTMLInputElement, metaKey: string): [any, TypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== TypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "checked") {
            return [element.checked, TypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, TypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementMetaValue(element: HTMLInputElement, metaKey: string, newValue: any): TypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== TypeElementStatus.META_KEY_NOT_EXISTS) return status;
        if (metaKey === "checked") {
            element.checked = Boolean(newValue);
            return TypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return TypeElementStatus.META_KEY_NOT_EXISTS;
    }
}

export class CheckboxType extends Type implements ElementType {
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

    override getFieldValue(field: Field): any {
        const value = field.getValue();
        if (["", "on"].includes(value)) return field.getMetaValue("checked");
        return field.getMetaValue("checked") ? value : null;
    }

    override setFieldValue(field: Field, newValue: any): any {
        if (["", "on"].includes(field.getValue())) return field.setMetaValue("checked", newValue);
        return field.setMetaValue("checked", newValue != null && field.getValue() === newValue);
    }

    override getElementMetaValue(element: HTMLInputElement, metaKey: string): [any, TypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== TypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "checked") {
            return [element.checked, TypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, TypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementMetaValue(element: HTMLInputElement, metaKey: string, newValue: any): TypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== TypeElementStatus.META_KEY_NOT_EXISTS) return status;
        if (metaKey === "checked") {
            element.checked = Boolean(newValue);
            return TypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return TypeElementStatus.META_KEY_NOT_EXISTS;
    }
}

export class SelectType extends Type implements ElementType {
    private _multiple: boolean;
    private _of: Type;

    constructor() {
        super("select");
        this._multiple = false;
        /**
         * @type {Type}
         */
        this._of = Type.text();
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

    of(type: Type): this {
        this._of = type;
        return this;
    }

    override getFieldValue(field: Field): any {
        const value = field.getValue();
        const options = field.getMetaValue("options") as SelectOption[];
        const optionValues = options.map(option => option.value);

        if (this._multiple) {
            return value.filter((value: any) => optionValues.some(optionValue => optionValue == value));
        } else {
            return optionValues.some(optionValue => optionValue == value) ? value : options.find((option) => option.selected)?.value ?? options.find(option => !option.disabled)?.value ?? null;
        }
    }

    override getElementValue(element: HTMLSelectElement): [any, TypeElementStatus] {
        if (this._multiple) {
            return [Array.from(element.selectedOptions, option => option.value), TypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [element.value, TypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED];
    }

    override getElementMetaValue(element: HTMLSelectElement, metaKey: string): [any, TypeElementStatus] {
        const [value, status] = super.getElementMetaValue(element, metaKey);
        if (status !== TypeElementStatus.META_KEY_NOT_EXISTS) {
            return [value, status];
        }
        if (metaKey === "options") {
            return [Array.from(element.options, option => ({ value: option.value || option.textContent, disabled: option.disabled, selected: option.selected, textContent: option.textContent })), TypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED];
        }
        return [undefined, TypeElementStatus.META_KEY_NOT_EXISTS];
    }

    override setElementValue(element: HTMLSelectElement, newValue: any): TypeElementStatus {
        Array.from(element.selectedOptions).forEach(option => {
            option.selected = false;
        });
        (this._multiple ? newValue as any[] : [newValue]).map((value: any): HTMLOptionElement | null => {
            return element.querySelector(`option[value="${value}"]`);
        }).filter(option => option != null).forEach(option => {
            option.selected = true;
        });
        return TypeElementStatus.VALUE_SET_SUCCESS;
    }

    override setElementMetaValue(element: HTMLSelectElement, metaKey: string, newValue: any): TypeElementStatus {
        const status = super.setElementMetaValue(element, metaKey, newValue);
        if (status !== TypeElementStatus.META_KEY_NOT_EXISTS) return status;
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
            return TypeElementStatus.META_VALUE_SET_SUCCESS;
        }
        return TypeElementStatus.META_KEY_NOT_EXISTS;
    }
}

export class ObjectType extends Type implements PrimitiveType {
    constructor() {
        super("Object");
    }

    isValuesEqual(a: any, b: any): boolean {
        return deepEqual(a, b);
    }
}

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

export class FieldChangeSet {
    private _changes: FieldChange[];
    private _maxSize: number;

    constructor(maxSize = 128) {
        this._changes = [];
        this._maxSize = maxSize;
    }

    trimProcessedChanges() {
        while (this._changes.length > this._maxSize) {
            const index = this._changes.findIndex(change => change.processed);
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
        return FieldChangeSet.asChangedNames(lastChanges);
    }
}

export interface FieldContext {
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

export class Field extends EventTarget {
    private _name: string;
    private _type: Type;
    private _changeSet: FieldChangeSet;
    private _initializedStateKeys: Set<string>;
    private _initialValue: any;
    private _valueMap: Map<string, any>;
    private _initialMeta: Map<string, InitialMetaItem>;
    private _metaMap: Map<string, Map<string, any>>;
    private _currentStateKey: string;

    constructor(name: string, type: Type, { changeSet = null, effectManager = null }: { changeSet?: FieldChangeSet | null, effectManager?: EffectManager | null } = {}) {
        super();
        this._name = name;
        this._type = type;
        this._initializedStateKeys = new Set();

        this._initialValue = this.type.getInitialValue();
        this._valueMap = new Map();

        this._initialMeta = this.type.getInitialMeta();
        this._metaMap = new Map();

        this._changeSet = changeSet ?? new FieldChangeSet(32);
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

    get context(): FieldContext {
        return {
            disabledIsNull: true,
            initiator: null,
            stateKey: null,
            raw: false,
            processChanges: false
        };
    }

    get changeSet(): FieldChangeSet {
        return this._changeSet;
    }

    get name(): string {
        return this._name;
    }

    get type(): Type {
        return this._type;
    }

    clearInitialMeta(): void {
        this._initialMeta = new Map();
    }

    reset({ stateKey = null, initiator = null, processChanges = false, full = false }: FieldContext & { full?: boolean } = {}): Set<string> {
        stateKey ??= this._currentStateKey;
        logger.log("[Field.reset] Reset state `%s` for field `%s`", stateKey, this.name);
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

    initializeState({ stateKey, initiator = null }: FieldContext & { stateKey: string }): void {
        if (!this._initializedStateKeys.has(stateKey)) {
            logger.log("[Field.initializeState] Initializing state key `%s` for field `%s`", stateKey, this.name);
            this._initializedStateKeys.add(stateKey);
            this.reset({ stateKey, initiator, processChanges: true, full: true });
        }
    }

    switchState({ stateKey, initiator = null, processChanges = false }: FieldContext & { stateKey: string }): Set<string> {
        logger.log("[Field.switchState] Switching state for field `%s` from `%s` to `%s`", this.name, this._currentStateKey, stateKey);
        this.initializeState({ stateKey, initiator });
        for (const [metaKey, newValue] of this._metaMap.get(stateKey)!.entries()) {
            const oldValue = this._metaMap.get(this._currentStateKey)!.get(metaKey);
            if (!deepEqual(oldValue, newValue)) {
                logger.log("[Field.switchState] Field meta value %s has change between stages", getMetaDependencyKey(this.name, metaKey));
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
        if (!this.type.isValuesEqual(oldValue, newValue)) {
            logger.log("[Field.switchState] Field value %s has change between stages", this.name)
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

    getAdapter(outerContext: FieldContext) {
        return new Proxy(this, {
            get(target, propertyKey, receiver) {
                switch (propertyKey) {
                    case "self":
                        return target;
                    case "context":
                        return outerContext;
                    case "getAdapter":
                        return (innerContext: FieldContext = {}) => target.getAdapter({ ...outerContext, ...innerContext });
                    case "getValue":
                        return (innerContext: FieldContext = {}) => target.getValue({ ...outerContext, ...innerContext });
                    case "getMetaValue":
                        return (metaKey: string, innerContext: FieldContext = {}) => target.getMetaValue(metaKey, { ...outerContext, ...innerContext });
                    case "setValue":
                        return (newValue: any, innerContext: FieldContext = {}) => target.setValue(newValue, { ...outerContext, ...innerContext });
                    case "setMetaValue":
                        return (metaKey: string, newValue: any, innerContext: FieldContext = {}) => target.setMetaValue(metaKey, newValue, { ...outerContext, ...innerContext });
                    default:
                        const value = Reflect.get(target, propertyKey, receiver);
                        return typeof value === "function" ? value.bind(target) : value;
                }
            }
        });
    }

    getValue({ stateKey = null, raw = false, disabledIsNull = true }: FieldContext = {}): any {
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

    setValue(newValue: any, { stateKey = null, raw = false, initiator = null, processChanges = false }: FieldContext = {}): Set<string> {
        if (!raw) {
            return this.type.setFieldValue(this.getAdapter({ stateKey, raw: true, processChanges, initiator }), newValue);
        }
        initiator ??= this;
        stateKey ??= this._currentStateKey;
        this.initializeState({ stateKey, initiator });
        const oldValue = this.getValue({ stateKey, raw: true });
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
        logger.log("[Field.setValue] Value changed:", { oldValue, newValue, stateKey });
        this.changeSet.add(change);
        return this.processChanges(FieldChangeType.Value, !processChanges);
    }

    getMetaValue(metaKey: string, { stateKey = null, raw = false }: FieldContext = {}): any {
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

    setMetaValue(metaKey: string, newValue: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FieldContext = {}): Set<string> {
        if (!raw) {
            return this.type.setFieldMetaValue(this.getAdapter({ stateKey, raw: true, initiator, processChanges }), metaKey, newValue);
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
        logger.log("[Field.setMetaValue] Meta", getMetaDependencyKey(this.name, metaKey), "value changed:", { oldValue, newValue, stateKey });
        return this.processChanges(FieldChangeType.MetaValue, !processChanges);
    }

    processChanges(type: FieldChangeType | null = null, dryRun: boolean = false): Set<string> {
        return this.changeSet.processChanges(this, type, dryRun);
    }
}

export class FieldArray {
    constructor(public fieldArray: Field[]) { }

    getAdapter(outerContext: FieldContext) {
        return new Proxy(this, {
            get(target, propertyKey, receiver) {
                switch (propertyKey) {
                    case "self":
                        return target;
                    case "context":
                        return outerContext;
                    case "getAdapter":
                        return (innerContext: FieldContext = {}) => target.getAdapter({ ...outerContext, ...innerContext });
                    case "getValue":
                        return (innerContext: FieldContext = {}) => target.getValue({ ...outerContext, ...innerContext });
                    case "getMetaValue":
                        return (metaKey: string, innerContext: FieldContext = {}) => target.getMetaValue(metaKey, { ...outerContext, ...innerContext });
                    case "setValue":
                        return (newValue: any, innerContext: FieldContext = {}) => target.setValue(newValue, { ...outerContext, ...innerContext });
                    case "setMetaValue":
                        return (metaKey: string, newValue: any, innerContext: FieldContext = {}) => target.setMetaValue(metaKey, newValue, { ...outerContext, ...innerContext });
                    default:
                        const value = Reflect.get(target, propertyKey, receiver);
                        return typeof value === "function" ? value.bind(target) : value;
                }
            }
        });
    }

    getValue({ stateKey = null, disabledIsNull = true, raw = false }: FieldContext = {}): any {
        return this.fieldArray.map(field => field.getValue({ stateKey, disabledIsNull, raw })).find(value => value != null);
    }

    getMetaValue(metaKey: string, { stateKey = null, raw = false }: FieldContext = {}): any {
        return this.fieldArray.map(field => field.getMetaValue(metaKey, { stateKey, raw })).find(value => value != null);
    }

    setValue(value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FieldContext = {}): Set<string> {
        return this.fieldArray.map(field => field.setValue(value, { stateKey, initiator, processChanges, raw })).find(changedNames => changedNames.size !== 0) ?? new Set();
    }

    setMetaValue(metaKey: string, value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FieldContext = {}): Set<string> {
        return this.fieldArray.map(field => field.setMetaValue(metaKey, value, { stateKey, initiator, processChanges, raw })).find(changedNames => changedNames.size !== 0) ?? new Set();
    }

    processChanges(type: FieldChangeType | null = null, dryRun: boolean = false): Set<string> {
        return this.fieldArray.map(field => field.processChanges(type, dryRun)).find(changedNames => changedNames.size !== 0) ?? new Set();
    }
}

export abstract class FieldLinker {
    public field: Field;
    public type: Type;

    constructor(field: Field) {
        this.field = field;
        this.type = field.type;
    }

    abstract link(): void;
    abstract unlink(): void;
}

export class FieldElementLinker extends FieldLinker {
    public element: any;
    private _handleHideContainer: ((event: Event) => void) | null;
    /**
     * 
     * @param {Field} field 
     * @param {Element} element 
     */
    constructor(field: Field, element: any) {
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
        logger.log("[FieldElementLinker._elementValueInputEventListener] Event")
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
        const changes = (event as FieldChangesEvent).changes.filter(change => change.initiator !== this);
        for (const change of changes) {
            if (change.type === FieldChangeType.Value) {
                this._syncElementValue();
            } else if (change.type === FieldChangeType.MetaValue) {
                this._syncElementMetaValue(change.metaKey);
            }
        }
    }

    _syncElementValue(): void {
        logger.log("[FieldElementLinker._syncElementValue] Syncing element value");
        const value = this.field.getValue({ raw: true });
        const status = this.type.setElementValue(this.element, value);
        if (status !== TypeElementStatus.VALUE_SET_SUCCESS) {
            logger.log("[FieldElementLinker._syncElementMetaValue] Failed to set element value, status `%s`", status);
            return;
        }
    }

    _getElementValue(): any {
        const [value, status] = this.type.getElementValue(this.element);
        if (status !== TypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED) {
            logger.warn("[FieldElementLinker._getElementValue] Failed to get value from element, status `%s`", status);
        }
        return value;
    }

    _syncFieldValue(): void {
        logger.log("[FieldElementLinker._syncFieldValue] Syncing field value");
        const value = this._getElementValue();
        if (value instanceof Promise) {
            value.then(value => this.field.setValue(value, { initiator: this, processChanges: true, raw: true }));
        } else {
            this.field.setValue(value, { initiator: this, processChanges: true, raw: true });
        }
    }

    _syncElementMetaValue(metaKey: string): void {
        logger.log("[FieldElementLinker._syncElementMetaValue] Syncing element meta value");
        const value = this.field.getMetaValue(metaKey, { raw: true });
        const status = this.type.setElementMetaValue(this.element, metaKey, value);
        if (status === TypeElementStatus.META_VALUE_SET_SUCCESS) {
            switch (metaKey) {
                case "options":
                    if (value.length !== 0) {
                        this._syncElementValue();
                    }
            }
            return;
        }
        if (status === TypeElementStatus.META_KEY_NOT_EXISTS) {
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

        logger.log("[FieldElementLinker._syncElementMetaValue] Failed to set element meta value, status `%s`", status);
    }

    _getElementMetaValue(metaKey: string): any {
        const [value, status] = this.type.getElementMetaValue(this.element, metaKey);
        if (status !== TypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED) {
            logger.warn("[FieldElementLinker._getElementMetaValue] Failed to get value from element, status `%s`", status);
        }
        return value;
    }

    _syncFieldMetaValue(metaKey: string): void {
        logger.log("[FieldElementLinker._syncFieldMeta] Syncing field meta value");
        this.field.setMetaValue(metaKey, this._getElementMetaValue(metaKey), { initiator: this, processChanges: true });
    }
}

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
        field = field.self;
        if (this.list.includes(field)) return false;
        field.addEventListener("changes", this._fieldChangesEventListener);
        this.list.push(field);
        return true;
    }

    remove(field: Field) {
        field = field.self;
        if (!this.list.includes(field)) return false;
        field.removeEventListener("changes", this._fieldChangesEventListener);
        this.list.splice(this.list.indexOf(field), 1);
        return true;
    }

    get(fieldName: string): Field | FieldArray {
        const fields = this.list.filter(field => field.name === fieldName)
        return fields.length === 1 ? fields[0] : new FieldArray(fields);
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
    abstract manage(form: Form, changes: FieldChange[]): void;
}

export class FormChangesForRadioManager extends FormChangesManager {
    override manage(form: Form, changes: FieldChange[]): void {
        changes.filter(change =>
            change.initiator !== form &&
            change.field.type.asElementType() === "radio" &&
            change.type === FieldChangeType.MetaValue &&
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
    override manage(form: Form, changes: FieldChange[]): void {
        changes = changes.filter(change => change.initiator !== form);
        if (changes.length === 0) return;
        form.effectManager.triggerEffects({ keys: FieldChangeSet.asChangedNames(changes) });
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
    public fieldsets: Record<string, HTMLFieldSetElement>;
    public effectManager: EffectManager;
    public fields: Fields;
    public fieldLinkers: FieldLinker[];
    public changeSet: FieldChangeSet;
    public focusActions: FocusAction[];
    private _changesManagers: FormChangesManager[];

    constructor({ form, focusActions }: { form: HTMLFormElement, focusActions?: FocusAction[] }) {
        super();
        this.form = form;
        this.changeSet = new FieldChangeSet();
        this.effectManager = new EffectManager();
        this.fields = new Fields();
        this.fieldLinkers = [];
        this.fieldsets = {};
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
        const changes = (event as FieldChangesEvent).changes;
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
            this.fields.get(fieldName).setMetaValue("dirty", { initiator: this, processChanges: true });
        }
        this.effectManager.triggerEffects();
    }

    registerElements(): void {
        for (const element of this.form.elements as any) {
            if (element.name === "") continue;
            const name = element.name;
            const type = Type.fromElement(element);
            const field = new Field(name, type, { changeSet: this.changeSet, effectManager: this.effectManager });
            const fieldElementLinker = new FieldElementLinker(field, type.wrap(element));
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

    addField(fieldName: string, type: Type): void {
        this.fields.add(new Field(fieldName, type, { changeSet: this.changeSet, effectManager: this.effectManager }));
    }

    addDisableWhenEffect(fieldName: string, disableWhen: () => Promise<boolean> | boolean, dependsOn: string[]): void {
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "disabled"),
            value: {
                type: "disable-when",
                callback: async () => {
                    const disabled = await disableWhen();
                    // logger.log(`[Effect.DisableWhen] Field ${fieldName} disabled: `, disabled);
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
                    // logger.log(`[Effect.VisibleWhen] Field ${fieldName} visible: `, visible);
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    return field.setMetaValue("visible", visible, { processChanges: true });
                },
            },
            dependsOn: [getMetaDependencyKey(fieldName, "disabled")]
        });
    }

    addComputedFieldEffect(fieldName: string, fieldType: Type, compute: () => Promise<any> | any, dependsOn: string[]): void {
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
                    // logger.log(`[Effect.FieldAutofill] Field ${fieldName} value: `, value);
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