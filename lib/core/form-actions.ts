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
    constructor() {
        super("GetFieldValue");
    }

    async handle(request: actions.Request<FieldRequest>): Promise<actions.Response<ValueResponse>> {
        const value = await request.body.field.getValue();
        return new actions.Response({ body: { value }, status: actions.Status.Ok })
    }
}

export class GetFieldMetaValueHandler extends actions.Handler<FieldRequest & MetaRequest, ValueResponse> {
    constructor() {
        super("GetFieldMetaValue");
    }

    async handle(request: actions.Request<FieldRequest & MetaRequest>): Promise<actions.Response<ValueResponse>> {
        const value = await request.body.field.getMetaValue(request.body.metaKey);
        return new actions.Response({ body: { value }, status: actions.Status.Ok })
    }
}

export class SetFieldValueHandler extends actions.Handler<FieldRequest & SetValueRequest, ChangedNamesResponse> {
    constructor() {
        super("SetFieldValue");
    }

    async handle(request: actions.Request<FieldRequest & SetValueRequest>): Promise<actions.Response<ChangedNamesResponse>> {
        const changedNames = await request.body.field.setValue(request.body.newValue);
        return new actions.Response({ body: { changedNames }, status: actions.Status.Ok })
    }
}

export class SetFieldMetaValueHandler extends actions.Handler<FieldRequest & MetaRequest & SetValueRequest, ChangedNamesResponse> {
    constructor() {
        super("SetFieldMetaValue");
    }

    async handle(request: actions.Request<FieldRequest & MetaRequest & SetValueRequest>): Promise<actions.Response<ChangedNamesResponse>> {
        const changedNames = await request.body.field.setMetaValue(request.body.metaKey, request.body.newValue);
        return new actions.Response({ body: { changedNames }, status: actions.Status.Ok })
    }
}

export class GetElementValueHandler extends actions.Handler<ElementRequest, ValueResponse> {
    constructor() {
        super("GetElementValue");
    }

    async handle(request: actions.Request<ElementRequest>): Promise<actions.Response<ValueResponse>> {
        const value = request.body.element.value;
        return new actions.Response({ body: { value }, status: actions.Status.Ok })
    }
}

export class GetElementMetaValueHandler extends actions.Handler<ElementRequest & MetaRequest, ValueResponse> {
    constructor() {
        super("GetElementMetaValue");
    }

    async handle(request: actions.Request<ElementRequest & MetaRequest>): Promise<actions.Response<ValueResponse>> {
        let value: any;
        const element = request.body.element;
        switch (request.body.metaKey) {
            case "disabled":
                value = element.disabled;
                break;
            default:

                throw new actions.ActionError({
                    response: new actions.Response({
                        body: { detail: "Meta key does not exists" },
                        status: actions.Status.get(403)
                    })
                });
                break;
        }
        return this.respond({ value }, actions.Status.Ok);
    }
}

export class SetElementValueHandler extends actions.Handler<ElementRequest & SetValueRequest, NoResponse> {
    constructor() {
        super("SetElementMeta");
    }

    async handle(request: actions.Request<ElementRequest & SetValueRequest>): Promise<actions.Response<NoResponse>> {
        request.body.element.value = request.body.newValue;
        return new actions.Response({ body: {}, status: actions.Status.Ok })
    }
}

export class SetElementMetaValueHandler extends actions.Handler<ElementRequest & SetValueRequest, NoResponse> {
    constructor() {
        super("SetElementMetaValue");
    }

    async handle(request: actions.Request<ElementRequest & SetValueRequest>): Promise<actions.Response<NoResponse>> {
        request.body.element.value = request.body.newValue;
        return new actions.Response({ body: {}, status: actions.Status.Ok })
    }
}

export class SyncFieldValueFromElementHandler extends actions.Handler<ElementRequest & FieldRequest, NoResponse> {
    constructor() {
        super("SyncFieldValueFromElement");
    }

    async handle(request: actions.Request<ElementRequest & FieldRequest>): Promise<actions.Response<NoResponse>> {
        const response1 = await getElementValueAction.handle({ element: request.body.element });
        const response2 = await setFieldValueAction.handle({ field: request.body.field, newValue: response1.body.value });
        return new actions.Response({ body: {}, status: actions.Status.Ok })
    }
}

export class SyncFieldMetaValueFromElementHandler extends actions.Handler<ElementRequest & FieldRequest & MetaRequest, NoResponse> {
    constructor() {
        super("SyncFieldMetaValueFromElement");
    }

    async handle(request: actions.Request<ElementRequest & FieldRequest & MetaRequest>): Promise<actions.Response<NoResponse>> {
        const response1 = await getElementMetaValueAction.handle({ element: request.body.element, metaKey: request.body.metaKey });
        const response2 = await setFieldMetaValueAction.handle({ field: request.body.field, metaKey: request.body.metaKey, newValue: response1.body.value });
        return new actions.Response({ body: {}, status: actions.Status.Ok });
    }
}

export class SyncElementValueFromFieldHandler extends actions.Handler<ElementRequest & FieldRequest, NoResponse> {
    constructor() {
        super("SyncElementValueFromField");
    }

    async handle(request: actions.Request<ElementRequest & FieldRequest>): Promise<actions.Response<NoResponse>> {
        const response1 = await getFieldValueAction.handle({ field: request.body.field });
        const response2 = await setElementValueAction.handle({ element: request.body.element, newValue: response1.body.value });
        return new actions.Response({ body: {}, status: actions.Status.Ok })
    }
}

export class SyncElementMetaValueFromFieldHandler extends actions.Handler<ElementRequest & FieldRequest & MetaRequest, NoResponse> {
    constructor() {
        super("SyncElementMetaValueFromField");
    }

    async handle(request: actions.Request<ElementRequest & FieldRequest & MetaRequest>): Promise<actions.Response<NoResponse>> {
        const response1 = await getFieldMetaValueAction.handle({ field: request.body.field, metaKey: request.body.metaKey });
        const response2 = await setElementMetaValueAction.handle({ element: request.body.element, metaKey: request.body.metaKey, newValue: response1.body.value });
        return new actions.Response({ body: {}, status: actions.Status.Ok })
    }
}

export class InitializeFieldStateFromElement extends actions.Handler<ElementRequest & FieldRequest, NoResponse> {
    async handle(request: actions.Request<ElementRequest & FieldRequest>): Promise<actions.Response<NoResponse>> {
        return new actions.Response({ body: {}, status: actions.Status.Ok });
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
getElementValueAction.setHandler(getElementValueHandler);

export const getElementMetaValueHandler = new GetElementMetaValueHandler();
export const getElementMetaValueAction = new actions.Action<ElementRequest & MetaRequest, ValueResponse>();
getElementMetaValueAction.setHandler(getElementMetaValueHandler);

export const setElementValueHandler = new SetElementValueHandler();
export const setElementValueAction = new actions.Action<ElementRequest & SetValueRequest, NoResponse>();
setElementValueAction.setHandler(setElementValueHandler);

export const setElementMetaValueHandler = new SetElementMetaValueHandler();
export const setElementMetaValueAction = new actions.Action<ElementRequest & MetaRequest & SetValueRequest, NoResponse>();
setElementMetaValueAction.setHandler(setElementMetaValueHandler);

export const syncFieldValueFromElementHandler = new SyncFieldValueFromElementHandler();
export const syncFieldValueFromElementAction = new actions.Action<ElementRequest & FieldRequest, NoResponse>();
syncFieldValueFromElementAction.setHandler(syncFieldValueFromElementHandler);

export const syncFieldMetaValueFromElementHandler = new SyncFieldMetaValueFromElementHandler();
export const syncFieldMetaValueFromElementAction = new actions.Action<ElementRequest & FieldRequest, NoResponse>();
syncFieldMetaValueFromElementAction.setHandler(syncFieldMetaValueFromElementHandler);

export const syncElementValueFromFieldHandler = new SyncElementValueFromFieldHandler();
export const syncElementValueFromFieldAction = new actions.Action<ElementRequest & FieldRequest, NoResponse>();
syncElementValueFromFieldAction.setHandler(syncElementValueFromFieldHandler);

export const syncElementMetaValueFromFieldHandler = new SyncElementMetaValueFromFieldHandler();
export const syncElementMetaValueFromFieldAction = new actions.Action<ElementRequest & FieldRequest, NoResponse>();
syncElementMetaValueFromFieldAction.setHandler(syncElementMetaValueFromFieldHandler);


async function setFieldValue(field: form.FormField, newValue: any) {
    
 }
async function setFieldMetaValue(field: form.FormField, metaKey: string, newValue: any) { }

async function getFieldValue(field: form.FormField) { }
async function getFieldMetaValue(field: form.FormField, metaKey: string) { }

async function setElementValue(element: form.FormElement, newValue: any) { }
async function setElementMetaValue(element: form.FormElement, metaKey: string, newValue: any) { }

async function getElementValue(element: form.FormElement) { }
async function getElementMetaValue(element: form.FormElement, metaKey: string) { }

async function setFieldArrayValue(fields: form.FormField[], newValue: any) { }
async function setFieldArrayMetaValue(fields: form.FormField[], metaKey: string, newValue: any) { }

async function getFieldArrayValue(fields: form.FormField[]) { }
async function getFieldArrayMetaValue(fields: form.FormField[], metaKey: string) { }

async function setElementArrayValue(elements: form.FormElement[], newValue: any) { }
async function setElementArrayMetaValue(elements: form.FormElement[], metaKey: string, newValue: any) { }

async function getElementArrayValue(elements: form.FormElement[]) { }
async function getElementArrayMetaValue(elements: form.FormElement[], metaKey: string) { }
