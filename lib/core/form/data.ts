import { Form } from ".";

export abstract class FormData {
    constructor(public readonly form: Form) { }


    abstract get(fieldName: string): any;
    abstract getAll(fieldName: string): any[];
}

export class DynamicFormData extends FormData {
    constructor(form: Form) { super(form); }

    get(fieldName: string): any { }

    getAll(fieldName: string): any[] {
        return [];
    }
}

export class StaticFormData extends FormData {
    constructor(form: Form) { super(form); }

    get(fieldName: string): any {

    }

    getAll(fieldName: string): any[] {
        return [];
    }
}