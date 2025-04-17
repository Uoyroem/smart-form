import { deepEqual } from "./utils";

export interface PrimitiveType { }
export interface ElementType {
    asElementType(): string;
}

export class Type {
    static object() {
        return new Object();
    }

    static boolean() {
        return new Boolean();
    }

    static text() {
        return new Text();
    }

    static file({ multiple = false } = {}) {
        return new File().multiple(multiple);
    }

    static number() {
        return new Number();
    }

    static date() {
        return new Date();
    }

    static month() {
        return new Month();
    }

    static select({ multiple = false } = {}) {
        return new Select().multiple(multiple);
    }

    static checkbox() {
        return new Checkbox();
    }

    static radio() {
        return new Radio();
    }

    static fromElement(element: any): Type {
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
                return this.file({ multiple: element.multiple });
            default:
                throw new Error(`As element type ${element} not has`);
        }
    }

    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    isSameType(otherType: Type): boolean { return this.name === otherType.name; }

    isEqual(a: any, b: any): boolean { return a === b; }
    isEmpty() { }
    asElementType() { return "hidden"; }
}

export class File extends Type implements ElementType {
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
}

export class Text extends Type implements PrimitiveType, ElementType {
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

export class Number extends Type implements PrimitiveType, ElementType {
    constructor() {
        super("Number");
    }

    asElementType(): string {
        return "number";
    }
}

export class Date extends Type implements PrimitiveType, ElementType {
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

export class Month extends Type implements PrimitiveType, ElementType {
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

export class Boolean extends Type implements PrimitiveType {
    constructor() {
        super("Boolean");
    }
}

export class Radio extends Type implements ElementType {
    constructor() {
        super("Radio");
    }

    asElementType(): string {
        return "radio";
    }
}

export class Checkbox extends Type implements ElementType {
    constructor() {
        super("Checkbox");
    }

    asElementType(): string {
        return "checkbox";
    }
}

export class Select extends Type implements ElementType {
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

    multiple(value: boolean = true): this {
        this._multiple = value;
        return this;
    }

    of(type: Type): this {
        this._of = type;
        return this;
    }
}

export class Object extends Type implements PrimitiveType {
    constructor() {
        super("Object");
    }

    isEqual(a: any, b: any): boolean {
        return deepEqual(a, b);
    }
}