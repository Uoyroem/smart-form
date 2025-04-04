import * as Uoyroem from "../../lib/index";

describe('Request', () => {
  test('should initialize with default registries', () => {
    const request = new Uoyroem.Request({ body: { test: 'data' } });
    expect(request.body).toEqual({ test: 'data' });
    expect(request.handlerRegistry).toBeInstanceOf(Uoyroem.Registry);
    expect(request.middlewaresRegistry).toBeInstanceOf(Uoyroem.Registry);
  });

  test('should initialize with custom registries', () => {
    const customRegistry = Uoyroem.Registry.get('custom');
    const request = new Uoyroem.Request({
      body: { test: 'data' },
      handlerRegistry: customRegistry,
      middlewaresRegistry: customRegistry
    });
    expect(request.handlerRegistry).toBe(customRegistry);
    expect(request.middlewaresRegistry).toBe(customRegistry);
  });
});

describe('Status', () => {
  test('should create and retrieve instances', () => {
    expect(Uoyroem.Status.Ok.code).toBe(1);
    expect(Uoyroem.Status.NoContent.code).toBe(2);
    expect(Uoyroem.Status.BadRequest.code).toBe(3);
    expect(Uoyroem.Status.NotImplemented.code).toBe(4);

    expect(Uoyroem.Status.Ok.successfull).toBe(true);
    expect(Uoyroem.Status.BadRequest.error).toBe(true);
  });

  test('get() should return existing instance', () => {
    const instance = Uoyroem.Status.get(1);
    expect(instance).toBe(Uoyroem.Status.Ok);
  });

  test('get() should throw for non-existent code', () => {
    expect(() => Uoyroem.Status.get(999)).toThrow();
  });
});

describe('Response', () => {
  test('should initialize correctly', () => {
    const response = new Uoyroem.Response({
      body: { data: 'test' },
      status: Uoyroem.Status.Ok
    });
    expect(response.body).toEqual({ data: 'test' });
    expect(response.status).toBe(Uoyroem.Status.Ok);
  });
});

describe('ActionError', () => {
  test('should create with response and cause', () => {
    const response = new Uoyroem.Response({
      body: { detail: 'Error detail' },
      status: Uoyroem.Status.BadRequest
    });
    const cause = new Error('Original error');
    const error = new Uoyroem.ActionError({ response, cause });

    expect(error.message).toBe('Error detail');
    expect(error.response).toBe(response);
    expect(error.cause).toBe(cause);
  });

  test('isActionError should detect ActionError', () => {
    const response = new Uoyroem.Response({
      body: { detail: 'Error' },
      status: Uoyroem.Status.BadRequest
    });
    const error = new Uoyroem.ActionError({ response });
    expect(Uoyroem.isActionError(error)).toBe(true);
    expect(Uoyroem.isActionError(new Error('Regular error'))).toBe(false);
  });
});

describe('Handler', () => {
  test('DefaultHandler should throw NotImplemented error', async () => {
    const handler = new Uoyroem.DefaultHandler();
    const request = new Uoyroem.Request({ body: {} });
    await expect(handler.handle(request)).rejects.toThrow(Uoyroem.ActionError);
  });
});

describe('Middleware', () => {
  test('CheckErrorStatusMiddleware should throw on error status', async () => {
    const middleware = new Uoyroem.CheckErrorStatusMiddleware();
    const request = new Uoyroem.Request({ body: {} });
    const errorResponse = new Uoyroem.Response({
      body: { detail: 'Error' },
      status: Uoyroem.Status.BadRequest
    });
    
    await expect(
      middleware.handle(request, async () => errorResponse)
    ).rejects.toThrow(Uoyroem.ActionError);
  });

  test('CheckErrorStatusMiddleware should pass through success status', async () => {
    const middleware = new Uoyroem.CheckErrorStatusMiddleware();
    const request = new Uoyroem.Request({ body: {} });
    const successResponse = new Uoyroem.Response({
      body: { data: 'success' },
      status: Uoyroem.Status.Ok
    });
    
    const result = await middleware.handle(request, async () => successResponse);
    expect(result).toBe(successResponse);
  });
});

describe('Action', () => {
  class TestHandler extends Uoyroem.Handler<any, any> {
    async handle(request: Uoyroem.Request<any>): Promise<Uoyroem.Response<any>> {
      return new Uoyroem.Response({
        body: request.body,
        status: Uoyroem.Status.Ok
      });
    }
  }

  class TestMiddleware extends Uoyroem.Middleware<any, any> {
    constructor() {
      super('TestMiddleware');
    }

    async handle(
      request: Uoyroem.Request<any>,
      getResponse: () => Promise<Uoyroem.Response<any>>
    ): Promise<Uoyroem.Response<any>> {
      request.body.modified = true;
      return getResponse();
    }
  }

  test('should use DefaultHandler when no handler set', async () => {
    const action = new Uoyroem.Action();
    const request = new Uoyroem.Request({ body: {} });
    await expect(action.handle(request)).rejects.toThrow(Uoyroem.ActionError);
  });

  test('should use custom handler', async () => {
    const action = new Uoyroem.Action();
    const handler = new TestHandler();
    action.setHandler(handler);
    
    const request = new Uoyroem.Request({ body: { test: 'data' } });
    const response = await action.handle(request);
    
    expect(response.body).toEqual({ test: 'data' });
    expect(response.status).toBe(Uoyroem.Status.Ok);
  });

  test('should apply middlewares in correct order', async () => {
    const action = new Uoyroem.Action();
    const handler = new TestHandler();
    const middleware = new TestMiddleware();
    
    action.setHandler(handler);
    action.addMiddleware(middleware);
    
    const request = new Uoyroem.Request({ body: {} });
    const response = await action.handle(request);
    
    expect(response.body).toEqual({ modified: true });
  });

  test('should wrap non-ActionError in ActionError', async () => {
    class ErrorHandler extends Uoyroem.Handler<any, any> {
      async handle(): Promise<Uoyroem.Response<any>> {
        throw new Error('Regular error');
      }
    }

    const action = new Uoyroem.Action();
    action.setHandler(new ErrorHandler());
    
    const request = new Uoyroem.Request({ body: {} });
    await expect(action.handle(request)).rejects.toThrow(Uoyroem.ActionError);
  });
});

describe('Registry', () => {
  test('should return same instance for same name', () => {
    const registry1 = Uoyroem.Registry.get('test');
    const registry2 = Uoyroem.Registry.get('test');
    expect(registry1).toBe(registry2);
  });

  test('should return different instances for different names', () => {
    const registry1 = Uoyroem.Registry.get('test1');
    const registry2 = Uoyroem.Registry.get('test2');
    expect(registry1).not.toBe(registry2);
  });

  test('fallback should create chain with additional registries', () => {
    const mainRegistry = Uoyroem.Registry.get('main');
    const chain = mainRegistry.fallback('fallback1', 'fallback2');
    
    expect(chain.registries.length).toBe(3);
    expect(chain.registries[0].name).toBe('main');
    expect(chain.registries[1].name).toBe('fallback1');
    expect(chain.registries[2].name).toBe('fallback2');
  });
});