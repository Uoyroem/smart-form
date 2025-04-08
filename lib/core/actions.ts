
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

/**
 * root -> GetFieldValue
 * radio-type -> GetFieldValue
 * 
 */

export type Handler = (this: ContextRegistry, input: Input, getResult?: () => Promise<Result | Result[]>) => Promise<Result>;

export class ActionError extends Error {

}

export function isActionError(error: unknown): error is ActionError {
    return error instanceof ActionError;
}

export interface Context {
    scope: string;
    actionScope?: Map<string, string>;
}

export type UnpackResult<InputData, DependsOn> = DependsOn extends [infer A, ...infer Rest] ? A extends Action<InputData, infer DependencyResultValue, any> ? [Result<DependencyResultValue>, ...UnpackResult<InputData, Rest>] : [] : [];

export type ActionHandler<InputData, ResultValue, DependsOn> =
    DependsOn extends [...infer Rest]
    ? (input: Input<InputData>, getResults: () => Promise<UnpackResult<InputData, Rest>>) => Promise<Result<ResultValue>>
    : DependsOn extends Action<InputData, infer DependencyResultValue, any>
    ? (input: Input<InputData>, getResult: () => Promise<Result<DependencyResultValue>>) => Promise<Result<ResultValue>>
    : (input: Input<InputData>) => Promise<Result<ResultValue>>;


class Action<InputData = any, ResultValue = any, DependsOn = any> {
    constructor(
        public readonly scope: string,
        public readonly name: string,
        public readonly handler: ActionHandler<InputData, ResultValue, DependsOn>,
        public readonly dependsOn: DependsOn
    ) { }
}

export function newAction<InputData, ResultValue, DependsOn extends null>(scope: string, name: string, handler: ActionHandler<InputData, ResultValue, DependsOn>, dependsOn?: DependsOn): Action<InputData, ResultValue, DependsOn>;
export function newAction<InputData, ResultValue, DependsOn extends Action<any, any, any>>(scope: string, name: string, handler: ActionHandler<InputData, ResultValue, DependsOn>, dependsOn?: DependsOn): Action<InputData, ResultValue, DependsOn>;
export function newAction<InputData, ResultValue, DependsOn extends Action<any, any, any>[]>(scope: string, name: string, handler: ActionHandler<InputData, ResultValue, [...DependsOn]>, dependsOn?: [...DependsOn]): Action<InputData, ResultValue, [...DependsOn]>;
export function newAction(scope: string, name: string, handler: ActionHandler<any, any, any>, dependsOn: any = null) {
    return new Action(scope, name, handler, dependsOn);
}



const action1 = newAction("1", "1", async (input: Input<string>) => {
    return new Result<number>(input, 1, Status.Ok);
}, null);

const action2 = newAction("2", "2", async (input: Input<string>, getResult) => {
    getResults();
    return new Result<number>(input, 1, Status.Ok);
}, action1);


export type ValueHandler = (this: ContextRegistry, input: Input) => Promise<any | Result>;
export type ObjectHandler = (this: ContextRegistry, input: Input) => Promise<{ result: any, status: Status } | Result>;

export class Registry {
    static readonly instance = new Registry();

    root(): ContextRegistry { return this.with({ scope: "root" }); }
    with(context: Context): ContextRegistry { return new ContextRegistry(this, context); }

    register<InputData, ResultValue, DependsOn>(action: Action<InputData, ResultValue, DependsOn>, context: Context): Action<InputData, ResultValue, DependsOn> {
        const existingActionIndex = this._actions.findIndex(action => action.name === name && action.scope === context.scope);
        if (existingActionIndex !== -1) {
            this._actions[existingActionIndex] = action;
        } else {
            this._actions.push(action);
        }
        return action;
    }

    delete(name: string, context: Context): boolean {
        const actionIndex = this._actions.findIndex(action => action.name === name && action.scope === context.scope);
        if (actionIndex !== -1) {
            this._actions.splice(actionIndex, 1);
            return true;
        }
        return false;
    }

    get(name: string, context: Context): Action<any, any, any> {
        const action = this._actions.find(action => action.name === name && action.scope === context.scope);
        if (!action) {
            throw new Error(`No handler for action "${name}" in scope "${context.scope}"`);
        }
        return action;
    }

    async handle(name: string, data: any, context: Context): Promise<Result> {
        const input = new Input(data, context);
        const handler = this.get(name, context).handler.bind(this.with(context));
        return await handler(input);
    }

    async redirect(name: string, input: Input, context: Context): Promise<Result> {
        return await this.get(name, context).handler.bind(this.with(context))(input);
    }

    private _actions: Action<any, any, any>[];
    private constructor() {
        this._actions = [];
    }
}

class ContextRegistry {
    constructor(public readonly registry: Registry, public readonly context: Context) { }

    register(name: string, handler: ValueHandler | ObjectHandler, { parent = null, handlerType = "value", ...context }: { parent?: Action<any, any> | null, handlerType?: string } & Partial<Context> = {}): Action {
        return this.registry.register(name, handler, { parent, handlerType, ...this.context, ...context });
    }

    with(context: Context): ContextRegistry {
        return new ContextRegistry(this.registry, { ...this.context, ...context });
    }

    get(name: string, context: Partial<Context> = {}): Action {
        return this.registry.get(name, { ...this.context, ...context });
    }

    delete(name: string, context: Partial<Context> = {}): boolean {
        return this.registry.delete(name, { ...this.context, ...context });
    }

    handle(name: string, data: any, context: Partial<Context> = {}): Promise<Result> {
        return this.registry.handle(name, data, { ...this.context, ...context });
    }

    redirect(name: string, input: Input, context: Partial<Context> = {}): Promise<Result> {
        return this.registry.redirect(name, input, { ...this.context, ...context });
    }
}

export const registry = Registry.instance.root();
