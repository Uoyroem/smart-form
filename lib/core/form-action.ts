/**
 * Планы на `FormAction`:
 * - Глобальный реестр действий форм
 * - Запрос на действие и ответ от него
 * - 
 */
// enum StateRequestType1 {

// }
// class FormActionRequestType {
//     constructor(public readonly description: string) { }
// }
// const actions = {
//     GetFieldValue: new FormActionRequestType("GetFieldValue"),
//     GetFieldMetaValue: new FormActionRequestType("GetFieldMetaValue"),
//     SetFieldValue: new FormActionRequestType("SetFieldValue"),
//     SetFieldMetaValue: new FormActionRequestType("SetFieldMetaValue"),
//     GetElementValue: new FormActionRequestType("GetElementValue"),
//     GetElementMetaValue: new FormActionRequestType("GetElementMetaValue"),
//     SetElementValue: new FormActionRequestType("SetElementValue"),
//     SetElementMetaValue: new FormActionRequestType("SetElementMetaValue"),
//     SyncFieldValueFromElement: new FormActionRequestType("SyncFieldValueFromElement"),
//     SyncElementValueFromField: new FormActionRequestType("SyncElementValueFromField"),
//     SyncFieldMetaValueFromElement: new FormActionRequestType("SyncFieldMetaValueFromElement"),
//     SyncElementMetaValueFromField: new FormActionRequestType("SyncElementMetaValueFromField"),
// }





export interface FormActionRequestBody { }
export interface FormActionResponseBody { }

export class FormActionRequest<Body extends FormActionRequestBody> {
    constructor(public body: Body) { }
}

export class FormActionResponseStatus {
    static instances: FormActionResponseStatus[] = [];
    static get(code: number): FormActionResponseStatus {
        let instance = this.instances.find(instance => instance.code === code);
        if (instance == null) throw new Error(`Form action response status with code "${code}" not exists`)
        return instance;
    }
    static getOrCreate(code: number, description: string): FormActionResponseStatus {
        let instance = this.instances.find(instance => instance.code === code);
        if (instance != null) { return instance; }
        instance = new FormActionResponseStatus(code, description)
        this.instances.push(instance);
        return instance;
    }

    static Success: FormActionResponseStatus;

    static {
        this.Success = this.getOrCreate(1, "OK");
    }

    private constructor(public readonly code: number, public readonly description: string) { }
}

export class FormActionResponse<Body extends FormActionResponseBody> {
    constructor(public body: Body, public status: FormActionResponseStatus) {
    }
}

export abstract class FormActionHandler<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody> {
    abstract handle(request: FormActionRequest<RequestBody>, registry: FormActionRegistry): Promise<FormActionResponse<ResponseBody>>;
}

export abstract class FormActionMiddleware<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody> {
    constructor(public readonly registry: FormActionRegistry = FormActionRegistry.instance) { }

    abstract handle(request: FormActionRequest<RequestBody>, getResponse: () => Promise<FormActionResponse<ResponseBody>>): Promise<FormActionResponse<ResponseBody>>;
}

export class FormActionType {
    constructor(public readonly code: number) {

    }
}

export class FormAction<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody> {
    public middlewares: FormActionMiddleware<RequestBody, ResponseBody>[];
    constructor(public handler: FormActionHandler<RequestBody, ResponseBody>) {
        this.middlewares = [];
    }

    async addMiddleware(middleware: FormActionMiddleware<RequestBody, ResponseBody>) {
        this.middlewares.push(middleware);
    }

    async handle(request: FormActionRequest<RequestBody>, registry: FormActionRegistry): Promise<FormActionResponse<ResponseBody>> {
        return await this.middlewares.reduceRight(
            (getResponse, middleware) => {
                return async () => await middleware.handle(request, getResponse);
            },
            async () => this.handler.handle(request, registry)
        )();
    }
}

export class FormActionRegistry {
    private constructor(public readonly parent?: FormActionRegistry) { }

    static readonly instance: FormActionRegistry = new FormActionRegistry();

    context(parent: FormActionRegistry = FormActionRegistry.instance): FormActionRegistry {
        return new FormActionRegistry(parent);
    }

    getActionMiddlewares<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody>(action: FormAction<RequestBody, ResponseBody>) {
        const registries: FormActionRegistry[] = [];
        let registry: FormActionRegistry | undefined = this;
        while (registry != null) {
            registries.push(registry);
            registry = registry.parent;
        }
        return action.middlewares.filter(middleware => registries.includes(middleware.registry))
    }

    async fetch<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody>(action: FormAction<RequestBody, ResponseBody>, request: FormActionRequest<RequestBody>): Promise<FormActionResponse<ResponseBody>> {
        return action.handle(request, this);
    }
}

export const formActions = FormActionRegistry.instance;