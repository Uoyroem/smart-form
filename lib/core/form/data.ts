import { Form } from ".";

export abstract class FormData {
    constructor(public readonly form: Form) { }

    abstract get(fieldName: string): any;
    abstract getAll(fieldName: string): any[];
}

export class DynamicFormData extends FormData {
    constructor(form: Form) {
        super(form);
    }

    get(fieldName: string): any {
        const fields = this.form.fields.get(fieldName);
        if (fields.length === 0) return undefined;
        if (fields.length === 1) {
            const field = fields[0];
            if (field.getMetaValue("disabled")) {
                return null;
            }

            return field.getValue();
        }        
    }

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