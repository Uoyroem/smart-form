
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

    static create(code: number, tags: ReadonlySet<string>, description: string): Status {
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

    protected constructor(public readonly code: number, public readonly tags: ReadonlySet<string>, public readonly description: string) { }
}


export class Input {
    constructor (data: any) {

    }
}

export class Output {
    constructor (result: any) {

    }
}

class Action {
    constructor (handler: (input: Input) => Output) {

    }
}


export class Registry {
    public actions: Map<string, Action>;

    constructor () {
        this.actions = new Map();
    }

    register(key: string, handler: (input: Input) => Output) {

    }

    fetch() {

    }
}