import { Form } from '.';
import { FormElement_ as FormElement } from './element';
import { Field, FieldChange } from "./field";

interface SetFieldValueRequest {
    action: "set";
    entityType: "field";
    target: "value";
    entity: Field;
    newValue: any;
}

interface SetFieldMetaRequest {
    action: "set";
    entityType: "field";
    target: "meta-value";
    entity: Field;
    metaKey: string;
    newValue: any;
}

interface GetFieldValueRequest {
    action: "get";
    entityType: "field";
    target: "value";
    entity: Field;
}

interface GetFieldMetaRequest {
    action: "get";
    entityType: "field";
    target: "meta-value";
    entity: Field;
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
    entity: Field[];
    newValue: any;
}

interface SetFieldsMetaRequest {
    action: "set";
    entityType: "fields";
    target: "meta-value";
    entity: Field[];
    metaKey: string;
    newValue: any;
}

interface GetFieldsValueRequest {
    action: "get";
    entityType: "fields";
    target: "value";
    entity: Field[];
}

interface GetFieldsMetaRequest {
    action: "get";
    entityType: "fields";
    target: "meta-value";
    entity: Field[];
    metaKey: string;
}

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
    | GetFieldsMetaRequest;


export interface AccessResult {
    result: any;
    status: string;
}

export class AccessError extends Error {
    constructor(public readonly accessResult: AccessResult, { cause }: ErrorOptions = {}) {
        super("Form access error", { cause })
    }
}

function isAccessError(error: unknown): error is AccessError {
    return error instanceof AccessError;
}

export abstract class DataManager {
    constructor(public readonly form: Form) { }
    public abstract access(request: FormAccessRequest): AccessResult;
    public abstract handleChanges(changes: FieldChange[]): void;
}

export class DefaultDataManager extends DataManager {
    public access(request: FormAccessRequest): AccessResult { return { result: undefined, status: "error" }; }
    public handleChanges(changes: FieldChange[]): void { }
}