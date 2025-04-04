export class Request<Body> {
    public body: Body;
    public handlerRegistry: ChainedRegistry;
    public middlewaresRegistry: ChainedRegistry;

    constructor({
        body,
        handlerRegistry = Registry.get(),
        middlewaresRegistry = Registry.get(),
    }: { body: Body, handlerRegistry?: ChainedRegistry, middlewaresRegistry?: ChainedRegistry }) {
        this.body = body;
        this.handlerRegistry = handlerRegistry;
        this.middlewaresRegistry = middlewaresRegistry;
    }
}


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

export class Response<Body> {
    public body: Body;
    public status: Status;

    constructor({ body, status }: { body: Body, status: Status }) {
        this.body = body;
        this.status = status;
    }
}


export interface ErrorResponseBody {
    detail: string;
}

export class ActionError<ResponseBody extends ErrorResponseBody = ErrorResponseBody> extends Error {
    public response: Response<ResponseBody>;
    constructor({ response, cause }: { response: Response<ResponseBody>, cause?: unknown }) {
        super(response.body.detail, { cause });
        this.response = response;
    }
}

export function isActionError(error: unknown): error is ActionError {
    return error instanceof ActionError;
}


export abstract class Handler<RequestBody, ResponseBody> {
    abstract handle(request: Request<RequestBody>): Promise<Response<ResponseBody>>;
}

export abstract class Middleware<RequestBody, ResponseBody> {
    constructor(public readonly key: string) { }


    abstract handle(request: Request<RequestBody>, getResponse: () => Promise<Response<ResponseBody>>): Promise<Response<ResponseBody>>;
}

export class DefaultHandler extends Handler<any, any> {
    async handle(request: Request<any>): Promise<Response<any>> {
        throw new ActionError({ response: new Response<ErrorResponseBody>({ body: { detail: "Not implemented" }, status: Status.NotImplemented }), cause: request });
    }
}

export class CheckErrorStatusMiddleware extends Middleware<any, any> {
    constructor() {
        super("CheckErrorStatus");
    }

    async handle(request: Request<any>, getResponse: () => Promise<Response<any>>): Promise<Response<any>> {
        const response = await getResponse();
        if (response.status.error) {
            throw new ActionError({ response });
        }
        return response;
    }
}


export class Action<RequestBody, ResponseBody> {
    public registryHandler: Map<Registry, Handler<RequestBody, ResponseBody>>;
    public registryMiddlewares: Map<Registry, Map<string, Middleware<RequestBody, ResponseBody>>>;

    constructor() {
        this.registryHandler = new Map();
        this.registryMiddlewares = new Map();
    }

    getHandler(chainedRegistry: ChainedRegistry = Registry.get()) {
        for (const registry of chainedRegistry.registries) {
            if (!this.registryHandler.has(registry)) continue;
            return this.registryHandler.get(registry)!;
        }
        return new DefaultHandler();
    }

    setHandler(handler: Handler<RequestBody, ResponseBody>, registry: ChainedRegistry = Registry.get()) {
        this.registryHandler.set(registry.head, handler);
    }

    getMiddlewares(chainedRegistry: ChainedRegistry = Registry.get()): ReadonlyMap<string, Middleware<RequestBody, ResponseBody>> {
        for (const registry of chainedRegistry.registries) {
            if (!this.registryMiddlewares.has(registry)) continue;
            return this.registryMiddlewares.get(registry)!;
        }
        return new Map();
    }

    addMiddleware(middleware: Middleware<RequestBody, ResponseBody>, registry: ChainedRegistry = Registry.get()): void {
        if (!this.registryMiddlewares.has(registry.head)) {
            this.registryMiddlewares.set(registry.head, new Map());
        }
        this.registryMiddlewares.get(registry.head)!.set(middleware.key, middleware);
    }

    async handle(request: Request<RequestBody>): Promise<Response<ResponseBody>> {
        let response;
        try {
            response = await Array.from(this.getMiddlewares(request.middlewaresRegistry).values()).reduceRight(
                (getResponse, middleware) => async () => await middleware.handle(request, getResponse),
                async () => this.getHandler(request.handlerRegistry).handle(request)
            )();
        } catch (error) {
            if (isActionError(error)) {
                throw error;
            }
            throw new ActionError({
                response: new Response<ErrorResponseBody>({
                    body: { detail: "Action error" },
                    status: Status.BadRequest
                }),
                cause: error
            });
        }
        return response;
    }
}

export class RedirectHandler {

}

export interface ChainedRegistry {
    get head(): Registry;
    readonly registries: readonly Registry[];
    fallback(...names: string[]): RegistryChain;
}

export class RegistryChain implements ChainedRegistry {
    constructor(public readonly registries: Registry[]) { }

    get head(): Registry {
        return this.registries[0];
    }

    fallback(...names: string[]): RegistryChain {
        return new RegistryChain(this.registries.concat(names.map(name => Registry.get(name))));
    }
}

export class Registry implements ChainedRegistry {
    private static readonly instanceMap = new Map();
    static get(name: string = "root"): Registry {
        if (!this.instanceMap.has(name)) {
            this.instanceMap.set(name, new Registry(name));
        }
        return this.instanceMap.get(name);
    }
    public readonly registries: Registry[];
    private constructor(public readonly name: string) {
        this.registries = [this];
    }

    get head(): Registry {
        return this;
    }

    fallback(...names: string[]): RegistryChain {
        return new RegistryChain(this.registries.concat(names.map(name => Registry.get(name))));
    }
}

export const registry = Registry.get();