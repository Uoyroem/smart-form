import { FormField, FormElement_ as FormElement, Form, FormFieldChange } from "./form";


// Интерфейсы для запросов
interface SetFieldValueRequest {
    action: "set";
    entityType: "field";
    target: "value";
    entity: FormField;
    newValue: any;
}

interface SetFieldMetaRequest {
    action: "set";
    entityType: "field";
    target: "meta-value";
    entity: FormField;
    metaKey: string;
    newValue: any;
}

interface GetFieldValueRequest {
    action: "get";
    entityType: "field";
    target: "value";
    entity: FormField;
}

interface GetFieldMetaRequest {
    action: "get";
    entityType: "field";
    target: "meta-value";
    entity: FormField;
    metaKey: string;
}

interface SetElementValueRequest {
    action: "set";
    entityType: "element";
    target: "value";
    entity: FormElement;
    newValue: any;
}

interface SetElementMetaRequest {
    action: "set";
    entityType: "element";
    target: "meta-value";
    entity: FormElement;
    metaKey: string;
    newValue: any;
}

interface GetElementValueRequest {
    action: "get";
    entityType: "element";
    target: "value";
    entity: FormElement;
}

interface GetElementMetaRequest {
    action: "get";
    entityType: "element";
    target: "meta-value";
    entity: FormElement;
    metaKey: string;
}

interface SetFieldsValueRequest {
    action: "set";
    entityType: "fields";
    target: "value";
    entity: FormField[];
    newValue: any;
}

interface SetFieldsMetaRequest {
    action: "set";
    entityType: "fields";
    target: "meta-value";
    entity: FormField[];
    metaKey: string;
    newValue: any;
}

interface GetFieldsValueRequest {
    action: "get";
    entityType: "fields";
    target: "value";
    entity: FormField[];
}

interface GetFieldsMetaRequest {
    action: "get";
    entityType: "fields";
    target: "meta-value";
    entity: FormField[];
    metaKey: string;
}

interface SetElementsValueRequest {
    action: "set";
    entityType: "elements";
    target: "value";
    entity: FormElement[];
    newValue: any;
}

interface SetElementsMetaRequest {
    action: "set";
    entityType: "elements";
    target: "meta-value";
    entity: FormElement[];
    metaKey: string;
    newValue: any;
}

interface GetElementsValueRequest {
    action: "get";
    entityType: "elements";
    target: "value";
    entity: FormElement[];
}

interface GetElementsMetaRequest {
    action: "get";
    entityType: "elements";
    target: "meta-value";
    entity: FormElement[];
    metaKey: string;
}

// Объединение всех запросов
export type FormAccessRequest =
    | SetFieldValueRequest
    | SetFieldMetaRequest
    | GetFieldValueRequest
    | GetFieldMetaRequest
    | SetElementValueRequest
    | SetElementMetaRequest
    | GetElementValueRequest
    | GetElementMetaRequest
    | SetFieldsValueRequest
    | SetFieldsMetaRequest
    | GetFieldsValueRequest
    | GetFieldsMetaRequest
    | SetElementsValueRequest
    | SetElementsMetaRequest
    | GetElementsValueRequest
    | GetElementsMetaRequest;

// Результат выполнения операции
export interface FormAccessResult {
    result: any; // Значение для операций get, undefined для set
    status: string; // Статус выполнения
}

export class FormAccessError extends Error {
    constructor(public readonly accessResult: FormAccessResult, { cause }: ErrorOptions = {}) {
        super("Form access error", { cause })
    }
}

function isFormAccessError(error: unknown): error is FormAccessError {
    return error instanceof FormAccessError;
}

// Абстрактный класс с переименованным методом
export abstract class FormDataManager {
    constructor(public readonly form: Form) { }


    /**
     * Manages access to form field/element values and metadata.
     * @param operation - The operation to perform.
     * @returns Result of the operation with status.
     */
    public abstract access(request: FormAccessRequest): FormAccessResult;

    /**
     * Handles multiple form field changes.
     * @param changes - Array of changes to apply.
     */
    public abstract handleChanges(changes: FormFieldChange[]): void;
}

export class DefaultFormDataManager extends FormDataManager {
    public access(request: FormAccessRequest): FormAccessResult {
        if (request.action === "get") {
            if (request.entityType === "field") {
                if (request.target === "value") {
                    return {
                        result: request.entity.getValue(),
                        status: "value-successfully-received"
                    };
                } else {
                    return {
                        result: request.entity.getMetaValue(request.metaKey),
                        status: "meta-value-successfully-received"
                    };
                }
            } else if (request.entityType === "element") {
                
            }
        }
        throw new FormAccessError({ result: "Action", status: "no handler for this request" });
    }

    public handleChanges(changes: FormFieldChange[]): void {

    }
}