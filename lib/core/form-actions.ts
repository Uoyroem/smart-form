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

export interface NoResponse {

}

export class GetFieldValueHandler extends actions.Handler<FieldRequest, ValueResponse> {
    async handle(request: actions.Request<FieldRequest>): Promise<actions.Response<ValueResponse>> {
        const value = request.body.field.getValue();
        return new actions.Response({ body: { value }, status: actions.Status.Ok })
    }
}

export class GetFieldMetaValueHandler extends actions.Handler<FieldRequest & MetaRequest, ValueResponse> {
    async handle(request: actions.Request<FieldRequest & MetaRequest>): Promise<actions.Response<ValueResponse>> {
        const value = request.body.field.getMetaValue(request.body.metaKey);
        return new actions.Response({ body: { value }, status: actions.Status.Ok })
    }
}

export class SetFieldValueHandler extends actions.Handler<FieldRequest & SetValueRequest, ChangedNamesResponse> {
    async handle(request: actions.Request<FieldRequest & SetValueRequest>): Promise<actions.Response<ChangedNamesResponse>> {
        const changedNames = request.body.field.setValue(request.body.newValue);
        return new actions.Response({ body: { changedNames }, status: actions.Status.Ok })
    }
}

export class SetFieldMetaValueHandler extends actions.Handler<FieldRequest & MetaRequest & SetValueRequest, ChangedNamesResponse> {
    async handle(request: actions.Request<FieldRequest & MetaRequest & SetValueRequest>): Promise<actions.Response<ChangedNamesResponse>> {
        const changedNames = request.body.field.setMetaValue(request.body.metaKey, request.body.newValue);
        return new actions.Response({ body: { changedNames }, status: actions.Status.Ok })
    }
}

export class GetElementValueHandler extends actions.Handler<ElementRequest, ValueResponse> {
    async handle(request: actions.Request<ElementRequest>): Promise<actions.Response<ValueResponse>> {
        const value = request.body.element.value;
        return new actions.Response({ body: { value }, status: actions.Status.Ok })
    }
}

export class GetElementMetaValueHandler extends actions.Handler<ElementRequest & MetaRequest, ValueResponse> {
    async handle(request: actions.Request<ElementRequest & MetaRequest>): Promise<actions.Response<ValueResponse>> {
        let value: any;
        const element = request.body.element;
        switch (request.body.metaKey) {
            case "disabled":
                value = element.disabled;
                break;
            default:
                break;
        }
        return new actions.Response({ body: { value }, status: actions.Status.Ok })
    }
}

export class SetElementValueHandler extends actions.Handler<ElementRequest & SetValueRequest, NoResponse> {
    async handle(request: actions.Request<ElementRequest & SetValueRequest>): Promise<actions.Response<NoResponse>> {
        request.body.element.value = request.body.newValue;
        return new actions.Response({ body: {}, status: actions.Status.Ok })
    }
}


export class SetElementMetaValueHandler extends actions.Handler<ElementRequest & SetValueRequest, NoResponse> {
    async handle(request: actions.Request<ElementRequest & SetValueRequest>): Promise<actions.Response<NoResponse>> {
        request.body.element.value = request.body.newValue;
        return new actions.Response({ body: {}, status: actions.Status.Ok })
    }
}

export const getFieldValueAction = new actions.Action<FieldRequest, ValueResponse>();
export const getFieldValueHandler = new GetFieldValueHandler();
getFieldValueAction.setHandler(getFieldValueHandler);

export const getFieldMetaValueAction = new actions.Action<FieldRequest & MetaRequest, ValueResponse>();
export const getFieldMetaValueHandler = new GetFieldMetaValueHandler();
getFieldMetaValueAction.setHandler(getFieldMetaValueHandler);

export const getFieldArrayValueAction = new actions.Action<FieldArrayRequest, ValueResponse>();
export const getFieldArrayMetaValueAction = new actions.Action<FieldArrayRequest & MetaRequest, ValueResponse>();

export const setFieldValueAction = new actions.Action<FieldRequest & SetValueRequest, ChangedNamesResponse>();
export const setFieldValueHandler = new SetFieldValueHandler();
setFieldValueAction.setHandler(setFieldValueHandler);

export const setFieldMetaValueAction = new actions.Action<FieldRequest & MetaRequest & SetValueRequest, ChangedNamesResponse>();
export const setFieldMetaValueHandler = new SetFieldMetaValueHandler();
setFieldMetaValueAction.setHandler(setFieldMetaValueHandler)

export const setFieldArrayValueAction = new actions.Action<FieldArrayRequest & SetValueRequest, ChangedNamesResponse>();
export const setFieldArrayMetaValueAction = new actions.Action<FieldArrayRequest & MetaRequest & SetValueRequest, ChangedNamesResponse>();

export const getElementValueHandler = new GetElementValueHandler();
export const getElementValueAction = new actions.Action<ElementRequest, ValueResponse>();

export const getElementMetaValueAction = new actions.Action<ElementRequest & MetaRequest, ValueResponse>();
export const getElementMetaValueHandler = new GetElementMetaValueHandler();
getElementMetaValueAction.setHandler(getElementMetaValueHandler);

export const setElementValueAction = new actions.Action<ElementRequest & SetValueRequest, ValueResponse>();
export const setElementMetaValueAction = new actions.Action<ElementRequest & MetaRequest & SetValueRequest, ValueResponse>();



