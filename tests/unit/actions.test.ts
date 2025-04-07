import * as Uoyroem from "../../lib/index";

// Очистка состояния перед каждым тестом
beforeEach(() => {
  Uoyroem.Status.instances = []; // Очищаем статусы
  Uoyroem.Status.Ok = Uoyroem.Status.create(1, new Set(["successfull"]), "Ok");
  Uoyroem.Status.BadRequest = Uoyroem.Status.create(3, new Set(["error"]), "BadRequest");
});

describe("Action", () => {
  // Тестовый обработчик, возвращающий успешный результат
  class SuccessHandler extends Uoyroem.Handler<string, string> {
    constructor() {
      super("success");
    }

    async handle(
      request: Uoyroem.Request<string>,
      next: Uoyroem.NextCallback<string>
    ): Promise<Uoyroem.Response<string>> {
      return new Uoyroem.Response({
        body: `Success: ${request.body}`,
        status: Uoyroem.Status.Ok,
      });
    }
  }

  // Тестовый middleware, добавляющий префикс
  class PrefixMiddleware extends Uoyroem.Handler<string, string> {
    constructor() {
      super("prefix");
    }

    async handle(
      request: Uoyroem.Request<string>,
      next: Uoyroem.NextCallback<string>
    ): Promise<Uoyroem.Response<string>> {
      const response = await next();
      return new Uoyroem.Response({
        body: `Prefix - ${response.body}`,
        status: response.status,
      });
    }
  }

  // Тестовый middleware, выбрасывающий ошибку
  class ErrorMiddleware extends Uoyroem.Handler<string, string> {
    constructor() {
      super("error");
    }

    async handle(
      request: Uoyroem.Request<string>,
      next: Uoyroem.NextCallback<string>
    ): Promise<Uoyroem.Response<string>> {
      throw new Uoyroem.ActionError({
        response: new Uoyroem.Response({
          body: { detail: "Middleware error" },
          status: Uoyroem.Status.BadRequest,
        }),
      });
    }
  }

  test("should handle request with only base handler", async () => {
    const action = new Uoyroem.Action<string, string>();
    const handler = new SuccessHandler();
    action.setHandler(handler);

    const request = new Uoyroem.Request({ body: "test" });
    const response = await action.handle(request);

    expect(response.body).toBe("Success: test");
    expect(response.status).toBe(Uoyroem.Status.Ok);
    expect(response.status.successfull).toBe(true);
  });

  test("should handle request with middleware and base handler", async () => {
    const action = new Uoyroem.Action<string, string>();
    const middleware = new PrefixMiddleware();
    const handler = new SuccessHandler();

    action.setHandler(middleware, Uoyroem.Registry.get("middleware"));
    action.setHandler(handler, Uoyroem.Registry.get("base"));

    const registrySequence = Uoyroem.Registry.fallback("middleware", "base");
    const request = new Uoyroem.Request({ body: "test", registrySequence });
    const response = await action.handle(request);

    expect(response.body).toBe("Prefix - Success: test");
    expect(response.status).toBe(Uoyroem.Status.Ok);
    expect(response.status.successfull).toBe(true);
  });

  test("should throw ActionError when middleware fails", async () => {
    const action = new Uoyroem.Action<string, string>();
    const errorMiddleware = new ErrorMiddleware();
    const handler = new SuccessHandler();

    action.setHandler(errorMiddleware, Uoyroem.Registry.get("error"));
    action.setHandler(handler, Uoyroem.Registry.get("base"));

    const registrySequence = Uoyroem.Registry.fallback("error", "base");
    const request = new Uoyroem.Request({ body: "test", registrySequence });

    await expect(action.handle(request)).rejects.toThrow(
      Uoyroem.ActionError
    );
    await expect(action.handle(request)).rejects.toMatchObject({
      response: {
        body: { detail: "Middleware error" },
        status: Uoyroem.Status.BadRequest,
      },
    });
  });

  test("should throw error when no handlers are found", async () => {
    const action = new Uoyroem.Action<string, string>();
    const request = new Uoyroem.Request({ body: "test" });

    await expect(action.handle(request)).rejects.toThrow(
      "Handlers for registry not exists"
    );
  });

  test("should handle unexpected error in handler", async () => {
    class FailHandler extends Uoyroem.Handler<string, string> {
      constructor() {
        super("fail");
      }

      async handle(
        request: Uoyroem.Request<string>,
        next: Uoyroem.NextCallback<string>
      ): Promise<Uoyroem.Response<string>> {
        throw new Error("Unexpected error");
      }
    }

    const action = new Uoyroem.Action<string, string>();
    const handler = new FailHandler();
    action.setHandler(handler);

    const request = new Uoyroem.Request({ body: "test" });

    await expect(action.handle(request)).rejects.toThrow(
      Uoyroem.ActionError
    );
    await expect(action.handle(request)).rejects.toMatchObject({
      response: {
        body: { detail: "Action error" },
        status: Uoyroem.Status.BadRequest,
      },
    });
  });
});