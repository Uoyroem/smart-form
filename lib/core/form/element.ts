import { Form } from ".";
import { Type } from "./type";

export class FormElement_ {
    constructor(
        public readonly element: Element,
        public readonly type: Type,
        public readonly form: Form
    ) { }

    getValue(options: object): any {
        return this.form.dataManager.access({ action: "get", entityType: "element", target: "value", entity: this });
    }

    getMetaValue(metaKey: string, options: object): any {
        return this.form.dataManager.access({ action: "get", entityType: "element", target: "meta-value", metaKey, entity: this });
    }

    setValue(newValue: any, options: object): any {
        return this.form.dataManager.access({ action: "set", entityType: "element", target: "value", entity: this, newValue });
    }

    setMetaValue(metaKey: string, newValue: any, options: object): any {
        return this.form.dataManager.access({ action: "set", entityType: "element", target: "meta-value", entity: this, metaKey, newValue });
    }
}