import * as Uoyroem from "../../lib/index";

// Мокаем EffectManager для изоляции
jest.mock("../../lib/index", () => ({
    ...jest.requireActual("../../lib/index"),
    EffectManager: jest.fn().mockImplementation(() => ({
        triggerEffects: jest.fn(),
        addDependency: jest.fn(),
        addEffect: jest.fn(),
    })),
}));

describe("Field with TypeSelect and FieldElementLinker", () => {
    let selectElement: HTMLSelectElement;
    let field: Uoyroem.Field;
    let linker: Uoyroem.FieldElementLinker;
    let effectManager: jest.Mocked<Uoyroem.EffectManager>;

    beforeEach(() => {
        // Создаем select элемент
        selectElement = document.createElement("select");
        selectElement.name = "test-select";

        // Добавляем опции
        const option1 = document.createElement("option");
        option1.value = "value1";
        option1.textContent = "Value 1";
        const option2 = document.createElement("option");
        option2.value = "value2";
        option2.textContent = "Value 2";
        selectElement.append(option1, option2);

        // Инициализируем EffectManager
        effectManager = new Uoyroem.EffectManager() as jest.Mocked<Uoyroem.EffectManager>;
        effectManager.triggerEffects.mockClear();
        effectManager.addDependency.mockClear();

        // Создаем поле с типом select
        field = new Uoyroem.Field("test-select", Uoyroem.Type.select(), {
            effectManager,
        });

        // Создаем linker
        linker = new Uoyroem.FieldElementLinker(field, selectElement);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should initialize Field with select options from DOM", () => {
        // Привязываем элемент
        linker.link();

        // Проверяем метаданные options
        const options = field.getMetaValue("options");
        expect(options).toEqual([
            { value: "value1", textContent: "Value 1", disabled: false, selected: true },
            { value: "value2", textContent: "Value 2", disabled: false, selected: false },
        ]);

        // Проверяем начальное значение
        expect(field.getValue()).toBe("value1"); // Первая опция по умолчанию
    });

    test("should set and get value for single select", () => {
        // Привязываем элемент
        linker.link();

        // Устанавливаем валидное значение
        field.setValue("value2", { processChanges: true });
        expect(field.getValue()).toBe("value2");
        expect(selectElement.value).toBe("value2");

        // Устанавливаем невалидное значение
        field.setValue("invalid-value", { processChanges: true });
        expect(field.getValue()).toBe("value1"); // Возвращает null, так как нет в options
        expect(selectElement.value).toBe("value1"); // DOM сбрасывается
    });

    test("should handle multiple select values", () => {
        // Меняем на multiple select
        selectElement.multiple = true;
        selectElement.options[0].selected = false;
        field = new Uoyroem.Field("test-select", Uoyroem.Type.select({ multiple: true }), {
            effectManager,
        });
        linker = new Uoyroem.FieldElementLinker(field, selectElement);
        linker.link();

        // Устанавливаем значения
        field.setValue(["value1", "value2", "invalid-value"], { processChanges: true });
        expect(field.getValue()).toEqual(["value1", "value2"]); // Фильтрует невалидные
        expect(Array.from(selectElement.selectedOptions).map((opt) => opt.value)).toEqual([
            "value1",
            "value2",
        ]);

        // Устанавливаем полностью невалидные значения
        field.setValue(["invalid1", "invalid2"], { processChanges: true });
        expect(field.getValue()).toEqual([]); // Пустой массив
        expect(Array.from(selectElement.selectedOptions)).toEqual([]);
    });

    test("should sync field value to select element", () => {
        // Привязываем элемент
        linker.link();

        // Устанавливаем значение через поле
        field.setValue("value2", { processChanges: true });

        // Проверяем, что select элемент обновился
        expect(selectElement.value).toBe("value2");
    });

    test("should sync select element value to field", () => {
        // Привязываем элемент
        linker.link();

        // Меняем значение в DOM
        selectElement.value = "value2";
        selectElement.dispatchEvent(new Event("change"));

        // Проверяем, что поле обновилось
        expect(field.getValue()).toBe("value2");
    });

    test("should update options via setElementMetaValue", () => {
        // Привязываем элемент
        linker.link();
        // Обновляем options
        const newOptions = [
            { value: "new1", textContent: "New 1" },
            { value: "new2", textContent: "New 2" },
        ];
        field.setMetaValue("options", newOptions, { processChanges: true });

        // Проверяем, что DOM обновился
        expect(Array.from(selectElement.options).map((opt) => opt.value)).toEqual(["new1", "new2"]);
        expect(field.getMetaValue("options")).toEqual(newOptions);

        // Проверяем, что текущее значение сброшено (так как старое значение не в новых options)
        expect(field.getValue()).toBe("new1"); // Первая новая опция
    });

    test("should handle empty options", () => {
        // Очищаем options в DOM
        selectElement.innerHTML = "";
        linker.link();

        // Проверяем, что options пусты
        expect(field.getMetaValue("options")).toEqual([]);

        // Устанавливаем значение
        field.setValue("some-value", { processChanges: true });
        expect(field.getValue()).toBeNull(); // Возвращает null, так как нет options

        // Проверяем, что DOM не содержит выбранных опций
        expect(selectElement.value).toBe("");
    });

    test("should reset field and sync with select element", () => {
        // Привязываем элемент
        linker.link();

        // Устанавливаем значение и метаданные
        field.setValue("value2", { processChanges: true });
        field.setMetaValue("dirty", true, { processChanges: true });
        expect(field.getValue()).toBe("value2");
        expect(field.getMetaValue("dirty")).toBe(true);

        // Сбрасываем поле
        field.reset({ processChanges: true });

        // Проверяем, что значение и метаданные сброшены
        expect(field.getValue()).toBe("value1"); // Начальное значение (первая опция)
        expect(field.getMetaValue("dirty")).toBe(false); // Начальное значение метаданных
        expect(selectElement.value).toBe("value1"); // DOM синхронизирован
    });
});