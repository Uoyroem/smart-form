import * as actions from "./actions";
import * as form from "./form";


export interface FieldRequest {
    field: form.FormField;
}

export interface FieldArrayRequest {
    fieldArray: form.FormFieldArray;
}

export interface ElementRequest {
    element: form.FormElement;
}

export interface MetaRequest {
    metaKey: string;
}

export interface SetValueRequest {
    newValue: any;
}

export interface ValueResponse {
    value: any;
}

export interface ChangedNamesResponse {
    changedNames: Set<string>;
}

const getFieldValueAction = new actions.Action<FieldRequest, ValueResponse>();
const getFieldMetaValueAction = new actions.Action<FieldRequest & MetaRequest, ValueResponse>();
const getFieldArrayValueAction = new actions.Action<FieldArrayRequest, ValueResponse>();
const getFieldArrayMetaValueAction = new actions.Action<FieldArrayRequest & MetaRequest, ValueResponse>();
const setFieldValueAction = new actions.Action<FieldRequest & SetValueRequest, ChangedNamesResponse>();
const setFieldMetaValueAction = new actions.Action<FieldRequest & MetaRequest & SetValueRequest, ChangedNamesResponse>();
const setFieldArrayValueAction = new actions.Action<FieldArrayRequest & SetValueRequest, ChangedNamesResponse>();
const setFieldArrayMetaValueAction = new actions.Action<FieldArrayRequest & MetaRequest & SetValueRequest, ChangedNamesResponse>();
const getElementValueAction = new actions.Action<ElementRequest, ValueResponse>();
const getElementMetaValueAction = new actions.Action<ElementRequest & MetaRequest, ValueResponse>();
const setElementValueAction = new actions.Action<ElementRequest & SetValueRequest, ValueResponse>();
const setElementMetaValueAction = new actions.Action<ElementRequest & MetaRequest & SetValueRequest, ValueResponse>();



