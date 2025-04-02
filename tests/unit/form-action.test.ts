// form-action.test.ts
import * as Uoyroem from "../../lib/index";


// Реализации для тестов
class LogFormActionHandler extends Uoyroem.FormActionHandler<{ field: string }, { log: string }> {
    async handle(request: Uoyroem.FormActionRequest<{ field: string }>): Promise<Uoyroem.FormActionResponse<{ log: string }>> {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Имитация асинхронной работы
        return new Uoyroem.FormActionResponse({ log: `Logged: ${request.body.field}` }, Uoyroem.FormActionResponseStatus.Success);
    }
}

class ValidateFormActionMiddleware extends Uoyroem.FormActionMiddleware<{ field: string }, { log: string }> {
    async handle(
        request: Uoyroem.FormActionRequest<{ field: string }>,
        getResponse: () => Promise<Uoyroem.FormActionResponse<{ log: string }>>
    ): Promise<Uoyroem.FormActionResponse<{ log: string }>> {
        if (!request.body.field) {
            return new Uoyroem.FormActionResponse(
                { log: "Error: Field is empty" },
                Uoyroem.FormActionResponseStatus.getOrCreate(400, "Bad Request")
            );
        }
        return await getResponse();
    }
}

class LogTimeMiddleware extends Uoyroem.FormActionMiddleware<{ field: string }, { log: string }> {
    async handle(
        request: Uoyroem.FormActionRequest<{ field: string }>,
        getResponse: () => Promise<Uoyroem.FormActionResponse<{ log: string }>>
    ): Promise<Uoyroem.FormActionResponse<{ log: string }>> {
        const start = Date.now();
        const response = await getResponse();
        const timeTaken = Date.now() - start;
        response.body.log += ` (took ${timeTaken}ms)`;
        return response;
    }
}

// Middleware для проверки порядка выполнения
class FirstOrderMiddleware extends Uoyroem.FormActionMiddleware<{ field: string }, { log: string }> {
    constructor(private orderArray: string[]) {
        super();
    }
    async handle(
        request: Uoyroem.FormActionRequest<{ field: string }>,
        getResponse: () => Promise<Uoyroem.FormActionResponse<{ log: string }>>
    ): Promise<Uoyroem.FormActionResponse<{ log: string }>> {
        this.orderArray.push("first");
        return await getResponse();
    }
}

class SecondOrderMiddleware extends Uoyroem.FormActionMiddleware<{ field: string }, { log: string }> {
    constructor(private orderArray: string[]) {
        super();
    }
    async handle(
        request: Uoyroem.FormActionRequest<{ field: string }>,
        getResponse: () => Promise<Uoyroem.FormActionResponse<{ log: string }>>
    ): Promise<Uoyroem.FormActionResponse<{ log: string }>> {
        this.orderArray.push("second");
        return await getResponse();
    }
}

describe('FormAction', () => {
    let action: Uoyroem.FormAction<{ field: string }, { log: string }>;

    beforeEach(() => {
        // Создаём новый экземпляр перед каждым тестом
        action = new Uoyroem.FormAction(new LogFormActionHandler());
    });

    test('should process handler without middleware', async () => {
        const request = new Uoyroem.FormActionRequest({ field: "test" });
        const response = await Uoyroem.formActions.fetch(action, request);

        expect(response.body).toEqual({ log: "Logged: test" });
        expect(response.status).toBe(Uoyroem.FormActionResponseStatus.Success);
    });

    test('should apply single middleware and process handler', async () => {
        action.addMiddleware(new ValidateFormActionMiddleware());
        const request = new Uoyroem.FormActionRequest({ field: "test" });
        const response = await Uoyroem.formActions.fetch(action, request);

        expect(response.body).toEqual({ log: "Logged: test" });
        expect(response.status).toBe(Uoyroem.FormActionResponseStatus.Success);
    });

    test('should stop execution on middleware error', async () => {
        action.addMiddleware(new ValidateFormActionMiddleware());
        const request = new Uoyroem.FormActionRequest({ field: "" });
        const response = await Uoyroem.formActions.fetch(action, request);

        expect(response.body).toEqual({ log: "Error: Field is empty" });
        expect(response.status.code).toBe(400);
        expect(response.status.description).toBe("Bad Request");
    });

    test('should apply multiple middlewares sequentially', async () => {
        action.addMiddleware(new ValidateFormActionMiddleware());
        action.addMiddleware(new LogTimeMiddleware());
        const request = new Uoyroem.FormActionRequest({ field: "test" });
        const response = await Uoyroem.formActions.fetch(action, request);

        expect(response.body.log).toMatch(/^Logged: test \(took \d+ms\)$/);
        expect(response.status).toBe(Uoyroem.FormActionResponseStatus.Success);
    });

    test('should handle async operations correctly', async () => {
        action.addMiddleware(new LogTimeMiddleware());
        const request = new Uoyroem.FormActionRequest({ field: "async" });
        const startTime = Date.now();
        const response = await Uoyroem.formActions.fetch(action, request);
        const endTime = Date.now();

        expect(endTime - startTime).toBeGreaterThanOrEqual(50); // Задержка от setTimeout
        expect(response.body.log).toMatch(/^Logged: async \(took \d+ms\)$/);
        expect(response.status).toBe(Uoyroem.FormActionResponseStatus.Success);
    });

    test('should call middlewares in correct order', async () => {
        const middlewareOrder: string[] = [];
        const firstMiddleware = new FirstOrderMiddleware(middlewareOrder);
        const secondMiddleware = new SecondOrderMiddleware(middlewareOrder);

        action.addMiddleware(firstMiddleware);
        action.addMiddleware(secondMiddleware);

        const request = new Uoyroem.FormActionRequest({ field: "order" });
        await Uoyroem.formActions.fetch(action, request);

        expect(middlewareOrder).toEqual(["first", "second"]);
    });
});