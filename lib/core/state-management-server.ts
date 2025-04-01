namespace Uoyroem {
    enum StateRequestType1 {

    }

    class FormActionRequestType {
        constructor(public readonly description: string) { }
    }

    const actions = {
        GetFieldValue: new FormActionRequestType("GetFieldValue"),
        GetFieldMetaValue: new FormActionRequestType("GetFieldMetaValue"),
        SetFieldValue: new FormActionRequestType("SetFieldValue"),
        SetFieldMetaValue: new FormActionRequestType("SetFieldMetaValue"),
        GetElementValue: new FormActionRequestType("GetElementValue"),
        GetElementMetaValue: new FormActionRequestType("GetElementMetaValue"),
        SetElementValue: new FormActionRequestType("SetElementValue"),
        SetElementMetaValue: new FormActionRequestType("SetElementMetaValue"),
        SyncFieldValueFromElement: new FormActionRequestType("SyncFieldValueFromElement"),
        SyncElementValueFromField: new FormActionRequestType("SyncElementValueFromField"),
        SyncFieldMetaValueFromElement: new FormActionRequestType("SyncFieldMetaValueFromElement"),
        SyncElementMetaValueFromField: new FormActionRequestType("SyncElementMetaValueFromField"),
    }

    interface FormActionRequestBody { }
    interface FormActionResponseBody { }

    class FormActionRequest<Body extends FormActionRequestBody> {
        constructor(public readonly body: Body) {

        }
    }

    class FormActionResponseStatus {
        constructor(public readonly code: number, public readonly description: string) { }
    }

    class FormActionResponse<Body extends FormActionResponseBody> {
        constructor(public body: Body, public status: FormActionResponseStatus) {
        }
    }

    abstract class FormActionHandler1<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody> {
        abstract handle(request: FormActionRequest<RequestBody>): FormActionResponse<ResponseBody>;
    }

    abstract class FormActionHandler2<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody> {
        abstract handle(request: FormActionRequest<RequestBody>, getResponse: () => FormActionResponse<ResponseBody>): FormActionResponse<ResponseBody>;
    }

    class FormAction<RequestBody extends FormActionRequestBody, ResponseBody extends FormActionResponseBody> {
        private _handlers: FormActionHandler2<RequestBody, ResponseBody>[];

        constructor(public handler: FormActionHandler1<RequestBody, ResponseBody>) {
            this._handlers = [];
        }

        registerHandler(handler: FormActionHandler2<RequestBody, ResponseBody>): void {
            this._handlers.push(handler);
        }

        handle(request: FormActionRequest<RequestBody>): FormActionResponse<ResponseBody> {
            let index = 0;
            const getResponse = (): FormActionResponse<ResponseBody> => {
                if (index < this._handlers.length) {
                    const handler = this._handlers[index++];
                    return handler.handle(request, getResponse);
                }
                return this.handler.handle(request);
            };
            return getResponse();
        }
    }


    class Handler1 extends FormActionHandler1<{ field: string }, { result: number }> {
        handle(request: FormActionRequest<{ field: string; }>): FormActionResponse<{ result: number; }> {
            return new FormActionResponse({ result: 1 }, new FormActionResponseStatus(1, "GetFieldValue"));
        }
    }
    class Handler2 extends FormActionHandler2<{ field: string }, { result: number }> {
        handle(request: FormActionRequest<{ field: string; }>, getResponse: () => FormActionResponse<{ result: number; }>): FormActionResponse<{ result: number; }> {
            return getResponse();
        }
    }

    const GetFieldValue = new FormAction<{ field: string }, { result: number }>(new Handler1());
    GetFieldValue.registerHandler(new Handler2());
    const response = GetFieldValue.handle(new FormActionRequest({ field: "blyat" }));
    response.body?.result;
}