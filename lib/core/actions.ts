
// export class Request<Body> {
//     public body: Body;
//     public registrySequence: RegistrySequence;

//     constructor({
//         body,
//         registrySequence = Registry.get(),
//     }: { body: Body, registrySequence?: RegistrySequence }) {
//         this.body = body;
//         this.registrySequence = registrySequence;
//     }
// }


// export class Status {
//     static instances: Status[] = [];

//     static get(code: number): Status {
//         let instance = this.instances.find(instance => instance.code === code);
//         if (instance == null) throw new Error(`Form action response status with code "${code}" not exists`)
//         return instance;
//     }

//     static create(code: number, tags: ReadonlySet<string>, description: string): Status {
//         const instance = new Status(code, tags, description)
//         this.instances.push(instance);
//         return instance;
//     }

//     get successfull(): boolean {
//         return this.tags.has("successfull");
//     }

//     get error(): boolean {
//         return this.tags.has("error");
//     }

//     static Ok: Status;
//     static NoContent: Status;
//     static BadRequest: Status;
//     static NotImplemented: Status;

//     static {
//         this.Ok = this.create(1, new Set(["successfull"]), "Ok");
//         this.NoContent = this.create(2, new Set(["successfull"]), "NoContent");
//         this.BadRequest = this.create(3, new Set(["error"]), "BadRequest");
//         this.NotImplemented = this.create(4, new Set(["error"]), "NotImplemented");
//     }

//     protected constructor(public readonly code: number, public readonly tags: ReadonlySet<string>, public readonly description: string) { }
// }


// export class Response<Body> {
//     public body: Body;
//     public status: Status;

//     constructor({ body, status }: { body: Body, status: Status }) {
//         this.body = body;
//         this.status = status;
//     }
// }


// export class ActionError<ResponseBody> extends Error {
//     public response: Response<ResponseBody>;
//     constructor({ response, cause }: { response: Response<ResponseBody>, cause?: unknown }) {
//         super("Action error", { cause });
//         this.response = response;
//     }
// }


// export function isActionError<ResponseBody = any>(error: unknown): error is ActionError<ResponseBody> {
//     return error instanceof ActionError;
// }

// export type NextCallback<ResponseBody> = () => Promise<Response<ResponseBody>>;

// export abstract class Handler<RequestBody, ResponseBody> {
//     constructor(public readonly key: string) { }

//     respond(body: ResponseBody, status: Status): Response<ResponseBody> {
//         const response = new Response({ body, status });
//         return response;
//     }

//     abstract handle(request: Request<RequestBody>, next: NextCallback<ResponseBody> | null): Promise<Response<ResponseBody>>;
// }


// export class Action<RequestBody, ResponseBody> {
//     public registryHandler: Map<Registry, Handler<RequestBody, ResponseBody>>;

//     constructor() {
//         this.registryHandler = new Map();
//     }

//     setHandler(handler: Handler<RequestBody, ResponseBody>, registrySequence: RegistrySequence = Registry.get()): void {
//         this.registryHandler.set(registrySequence.head, handler);
//     }

//     getHandler(registrySequence: RegistrySequence = Registry.get()): Handler<RequestBody, ResponseBody> | undefined {
//         return this.registryHandler.get(registrySequence.head);
//     }

//     async handle(body: RequestBody, { registrySequence = Registry.get() }: { registrySequence?: RegistrySequence } = {}): Promise<Response<ResponseBody>> {
//         const request = new Request({ body, registrySequence });
//         let handlers: Handler<RequestBody, ResponseBody>[] = request.registrySequence.registries.map(registry => this.getHandler(registry)).filter(handler => handler != null);
//         if (handlers.length === 0) throw new Error("Handlers for registry not exists");
//         const base = handlers.at(-1)!;
//         const middlewares = handlers.slice(0, -1);

//         let response;
//         try {
//             response = await middlewares.reduceRight(
//                 (getResponse, middleware) => async () => await middleware.handle(request, getResponse),
//                 async () => base.handle(request, null)
//             )();
//         } catch (error) {
//             if (isActionError(error)) {
//                 throw error;
//             }
//             throw new ActionError({
//                 response: new Response({
//                     body: { detail: "Action error" },
//                     status: Status.BadRequest
//                 }),
//                 cause: error
//             });
//         }
//         return response;
//     }
// }

// export class RedirectHandler {

// }

// export interface RegistrySequence {
//     readonly registries: readonly Registry[];
//     get head(): Registry;
//     fallback(...names: string[]): RegistryChain;
// }

// export class RegistryChain implements RegistrySequence {
//     constructor(public readonly registries: readonly Registry[]) {
//         if (registries.length === 0) throw new Error("123")
//     }

//     get head(): Registry {
//         return this.registries[0];
//     }

//     fallback(...names: string[]): RegistryChain {
//         return new RegistryChain(this.registries.concat(names.map(name => Registry.get(name))));
//     }
// }

// export class Registry implements RegistrySequence {
//     private static readonly instanceMap = new Map();
//     static get(name: string = "root"): Registry {
//         if (!this.instanceMap.has(name)) {
//             this.instanceMap.set(name, new Registry(name));
//         }
//         return this.instanceMap.get(name);
//     }
//     static fallback(...names: string[]) {
//         return new RegistryChain(names.map(name => Registry.get(name)));
//     }
//     public readonly registries: readonly Registry[];
//     private constructor(public readonly name: string) {
//         this.registries = [this];
//     }

//     get head(): Registry {
//         return this;
//     }

//     fallback(...names: string[]): RegistryChain {
//         return new RegistryChain(this.registries.concat(names.map(name => Registry.get(name))));
//     }
// }

// export const registry = Registry.get();


export class Status {
    static instances: Status[] = [];

    static get(code: number): Status {
        let instance = this.instances.find(instance => instance.code === code);
        if (instance == null) throw new Error(`Form action response status with code "${code}" not exists`)
        return instance;
    }

    static create(code: number, tags: Iterable<string>, description: string): Status {
        const instance = new Status(code, tags, description)
        this.instances.push(instance);
        return instance;
    }

    get successfull(): boolean {
        return this.tags.has("successfull");
    }

    get error(): boolean {
        return this.tags.has("error");
    }

    static Ok: Status;
    static NoContent: Status;
    static BadRequest: Status;
    static NotImplemented: Status;

    static {
        this.Ok = this.create(1, new Set(["successfull"]), "Ok");
        this.NoContent = this.create(2, new Set(["successfull"]), "NoContent");
        this.BadRequest = this.create(3, new Set(["error"]), "BadRequest");
        this.NotImplemented = this.create(4, new Set(["error"]), "NotImplemented");
    }

    public readonly tags: ReadonlySet<string>;
    protected constructor(public readonly code: number, tags: Iterable<string>, public readonly description: string) {
        this.tags = new Set(tags);
    }
}


export class Input<Data = any> {
    constructor(public data: Data, public context: Context) { }
}

export class Result<Value = any> {
    constructor(public input: Input, public value: Value, public status: Status) { }
}

export class ActionError extends Error {

}

export function isActionError(error: unknown): error is ActionError {
    return error instanceof ActionError;
}

export interface Context {
    scope: Scope;
    actionScope?: Map<Action<any, any>, Scope>;
}

export class Scope {
    static instances: Scope[] = [];

    private constructor(public readonly name: string) { }

    static get(name: string): Scope {
        return this.instances.find(scope => scope.name === name) ?? new Scope(name);
    }
}

abstract class Handler<InputData, ResultValue> { }

type IndependentHandlerCallback<InputData, ResultValue> = (input: Input<InputData>) => Promise<Result<ResultValue>>

class IndependentHandler<InputData, ResultValue> extends Handler<InputData, ResultValue> {
    constructor(public readonly callback: IndependentHandlerCallback<InputData, ResultValue>) { super(); };
}

export interface Dependency<InputData, ResultValue> {
    action: Action<InputData, ResultValue>;
    scope: Scope;
}

type UnpackResult<InputData, DependsOn> = DependsOn extends [infer A, ...infer Rest] ? A extends Dependency<InputData, infer DependencyResultValue> ? [Result<DependencyResultValue>, ...UnpackResult<InputData, Rest>] : [] : [];
type DependentHandlerCallback<InputData, ResultValue, DependsOn extends Dependency<InputData, any>[]> = (input: Input<InputData>, getResults: () => Promise<UnpackResult<InputData, [...DependsOn]>>) => Promise<Result<ResultValue>>

class DependentHandler<InputData, ResultValue, DependsOn extends Dependency<InputData, any>[]> extends Handler<InputData, ResultValue> {
    constructor(public readonly callback: DependentHandlerCallback<InputData, ResultValue, [...DependsOn]>, public readonly dependsOn: [...DependsOn]) { super(); }
}


export class Action<InputData, ResultValue> {
    private _scopeHandlerMap: WeakMap<Scope, Handler<InputData, ResultValue>>;

    constructor(public readonly name: string) { this._scopeHandlerMap = new Map(); }

    setHandler(scope: Scope, handler: Handler<InputData, ResultValue>): void {
        this._scopeHandlerMap.set(scope, handler);
    }

    getHandler(scope: Scope): Handler<InputData, ResultValue> {
        const handler = this._scopeHandlerMap.get(scope);
        if (handler == null) throw new Error(`No handler for action "${this.name}" scope "${scope}"`);
        return handler;
    }

    removeHandler(scope: Scope): boolean {
        return this._scopeHandlerMap.delete(scope);
    }
}


export class Manager {
    static readonly instance = new Manager();

    root(): ContextRegistry { return this.with({ scope: Scope.get("root") }); }
    with(context: Context): ContextRegistry { return new ContextRegistry(this, context); }

    registerDepedentHandler<InputData, ResultValue, DependsOn extends Dependency<InputData, any>[]>(action: Action<InputData, ResultValue>, callback: DependentHandlerCallback<InputData, ResultValue, DependsOn>, dependsOn: [...DependsOn], context: Context): void {
        action.setHandler(context.scope, new DependentHandler(callback, dependsOn));
    }

    registerIndepedentHandler<InputData, ResultValue>(action: Action<InputData, ResultValue>, callback: IndependentHandlerCallback<InputData, ResultValue>, context: Context): void {
        action.setHandler(context.scope, new IndependentHandler(callback));
    }

    delete<InputData, ResultValue>(action: Action<InputData, ResultValue>, context: Context): boolean {
        return action.removeHandler(context.scope);
    }

    get<InputData, ResultValue>(action: Action<InputData, ResultValue>, context: Context): Handler<InputData, ResultValue> {
        return action.getHandler(context.scope);
    }

    async handle<InputData, ResultValue>(action: Action<InputData, ResultValue>, data: InputData, context: Context): Promise<Result<ResultValue>> {
        const input = new Input<InputData>(data, context);

        const handler = this.get(action, context);
        if (handler instanceof IndependentHandler) {
            return await handler.callback(input);
        } else if (handler instanceof DependentHandler) {
            return await handler.callback(input, async () => []);
        } else {
            throw new TypeError("Handler")
        }
    }


    private constructor() { }
}

type ResultOrValue<T> = Result<T> | T;

// Универсальный декоратор
export function toResult<Args extends any[], ResultValue>(
    callback: (...args: Args) => ResultOrValue<ResultValue> | Promise<ResultOrValue<ResultValue>>,
    defaultStatus: Status = Status.Ok
): (...args: Args) => Promise<Result<ResultValue>> {
    return async (...args: Args): Promise<Result<ResultValue>> => {
        const rawResult = await callback(...args); // Выполняем функцию с любыми аргументами

        if (rawResult instanceof Result) {
            return rawResult; // Если уже Result, возвращаем как есть
        }

        // Определяем статус

        // Предполагаем, что первый аргумент может быть Input, если он есть, иначе создаем минимальный Input
        const input = args[0] instanceof Input ? args[0] : new Input(undefined, { scope: Scope.get("default") });

        return new Result(input, rawResult, defaultStatus); // Оборачиваем в Result
    };
}

interface RawResult<ResultValue> {
    value: ResultValue;
    status: Status;
}

type RawResultOrResult<T> = RawResult<T> | Result<T>;

export function fromRawResult<Args extends any[], ResultValue>(
    callback: (...args: Args) => RawResultOrResult<ResultValue> | Promise<RawResultOrResult<ResultValue>>
): (...args: Args) => Promise<Result<ResultValue>> {
    return async (...args: Args): Promise<Result<ResultValue>> => {
        const rawResult = await callback(...args); // Выполняем функцию

        // Если результат уже является экземпляром Result, возвращаем его
        if (rawResult instanceof Result) {
            return rawResult;
        }

        // Предполагаем, что это RawResult, извлекаем value и status
        const { value, status } = rawResult;

        // Создаем Input: берем первый аргумент, если он Input, иначе создаем минимальный
        const input = args[0] instanceof Input
            ? args[0]
            : new Input(undefined, { scope: Scope.get("default") });

        return new Result(input, value, status);
    };
}

export class ContextRegistry {
    constructor(public readonly manager: Manager, public readonly context: Context) { }

    registerDepedentHandler<InputData, ResultValue, DependsOn extends Dependency<InputData, any>[]>(action: Action<InputData, ResultValue>, callback: DependentHandlerCallback<InputData, ResultValue, DependsOn>, dependsOn: [...DependsOn], context: Partial<Context> = {}): void {
        return this.manager.registerDepedentHandler(action, callback, dependsOn, { ...this.context, ...context })
    }

    registerIndepedentHandler<InputData, ResultValue>(action: Action<InputData, ResultValue>, callback: IndependentHandlerCallback<InputData, ResultValue>, context: Partial<Context> = {}): void {
        return this.manager.registerIndepedentHandler(action, callback, { ...this.context, ...context })
    }

    with(context: Context): ContextRegistry {
        return new ContextRegistry(this.manager, { ...this.context, ...context });
    }

    delete<InputData, ResultValue>(action: Action<InputData, ResultValue>, context: Context): boolean {
        return this.manager.delete(action, { ...this.context, ...context });
    }

    get<InputData, ResultValue>(action: Action<InputData, ResultValue>, context: Context): Handler<InputData, ResultValue> {
        return this.manager.get(action, { ...this.context, ...context });
    }

    async handle<InputData, ResultValue>(action: Action<InputData, ResultValue>, data: InputData, context: Context): Promise<Result<ResultValue>> {
        return this.manager.handle(action, data, { ...this.context, ...context });
    }
}

export const manager = Manager.instance.root();
