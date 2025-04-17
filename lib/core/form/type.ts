import { deepEqual } from "./utils";

export interface PrimitiveType { }
export interface ElementType {
    asElementType(): string;
}

/**
 * Element у который value это 1000 но пользователь видит 1 000 можно использовать библеотеку IMask
 * 
 */

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

    static fileOne() {
        return new FileOneType();
    }
    static fileMultiple() {
        return new FileMultipleType();
    }

    static number() {
        return new NumberType();
    }

    static date() {
        return new DateType();
    }

    static month() {
        return new MonthType();
    }

    static selectOne() {
        return new SelectOneType();
    }

    static selectMultiple() {
        return new SelectOneType();
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
                return this.selectOne();
            case "select-multiple":
                return this.selectMultiple();
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
                return element.multiple ? this.fileMultiple() : this.fileOne();
            default:
                throw new Error(`As element type ${element} not has`);
        }
    }

    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    async toJSON() { }
    parse(value: any): any { }

    isSameType(otherType: Type): boolean { return this.name === otherType.name; }
    isValuesEqual(a: any, b: any): boolean { return a === b; }
    asElementType() { return "hidden"; }
}

export class FileOneType extends Type implements ElementType {
    constructor() {
        super("FileOne");
    }

    asElementType(): string {
        return "file";
    }

    parse(value: File): string {
        return value.name;
    }
}

export class FileMultipleType extends Type implements ElementType {
    constructor() {
        super("FileMultiple");
    }

    asElementType(): string {
        return "file";
    }

    parse(value: File[]): string[] {
        return value.map(value => value.name);
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

    parse(value: string): string {
        return value;
    }

    asElementType(): string {
        return this._area ? "textarea" : "text";
    }
}

export class NumberType extends Type implements PrimitiveType, ElementType {
    constructor() {
        super("Number");
    }

    asElementType(): string {
        return "number";
    }

    parse(value: string): number {
        return parseFloat(value);
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

    parse(value: string): Date {
        return new Date(value);
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

    parse(value: string): Date {
        return new Date(value);
    }
}

export class BooleanType extends Type implements PrimitiveType {
    constructor() {
        super("Boolean");
    }

    parse(value: string): boolean {
        return Boolean(value);
    }
}

export class RadioType extends Type implements ElementType {
    constructor() {
        super("Radio");
    }

    asElementType(): string {
        return "radio";
    }
}

export class CheckboxType extends Type implements ElementType {
    constructor() {
        super("Checkbox");
    }

    asElementType(): string {
        return "checkbox";
    }
}

export class SelectOneType extends Type implements ElementType {
    private _of: Type;

    constructor() {
        super("SelectOne");
        /**
         * @type {Type}
         */
        this._of = Type.text();
    }

    asElementType(): string {
        return "select-one";
    }

    of(type: Type): this {
        this._of = type;
        return this;
    }

    parse(value: string): any {
        return this._of.parse(value);
    }
}

export class SelectMultipleType extends Type implements ElementType {
    private _of: Type;

    constructor() {
        super("SelectMultiple");
        /**
         * @type {Type}
         */
        this._of = Type.text();
    }

    of(type: Type): this {
        this._of = type;
        return this;
    }

    asElementType(): string {
        return "select-multiple";
    }

    parse(value: any[]): any[] {
        return value.map(value => this._of.parse(value));
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