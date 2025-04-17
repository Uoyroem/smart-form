import * as Uoyroem from "../../lib/index";

// Мокаем EffectManager, чтобы изолировать его поведение
jest.mock("../../lib/index", () => ({
  ...jest.requireActual("../../lib/index"),
  EffectManager: jest.fn().mockImplementation(() => ({
    triggerEffects: jest.fn(),
    addDependency: jest.fn(),
    addEffect: jest.fn(),
  })),
}));

describe("Form.reset", () => {
  let formElement: HTMLFormElement;
  let form: Uoyroem.Form;
  let effectManager: jest.Mocked<Uoyroem.EffectManager>;

  beforeEach(() => {
    // Создаем HTML-форму для тестов
    formElement = document.createElement("form");

    // Инициализируем EffectManager мок
    effectManager = new Uoyroem.EffectManager() as jest.Mocked<Uoyroem.EffectManager>;
    effectManager.triggerEffects.mockClear();

    // Создаем экземпляр формы
    form = new Uoyroem.Form({ form: formElement });
    form.effectManager = effectManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should reset all fields in the form", async () => {
    // Добавляем поля в форму
    const field1 = new Uoyroem.Field("field1", Uoyroem.Type.text(), { effectManager });
    const field2 = new Uoyroem.Field("field2", Uoyroem.Type.number(), { effectManager });
    form.fields.add(field1);
    form.fields.add(field2);

    // Мокаем метод reset для полей
    const field1ResetSpy = jest.spyOn(field1, "reset").mockReturnValue(new Set());
    const field2ResetSpy = jest.spyOn(field2, "reset").mockReturnValue(new Set());

    // Вызываем reset
    form.reset();

    // Проверяем, что reset был вызван для каждого поля
    expect(field1ResetSpy).toHaveBeenCalledTimes(1);
    expect(field2ResetSpy).toHaveBeenCalledTimes(1);
  });

  test("should pass initiator as the form instance to fields", async () => {
    // Добавляем одно поле
    const field = new Uoyroem.Field("field", Uoyroem.Type.text(), { effectManager });
    form.fields.add(field);

    // Мокаем reset и проверяем аргументы
    const fieldResetSpy = jest.spyOn(field, "reset").mockReturnValue(new Set());

    // Вызываем reset
    form.reset();

    // Проверяем, что reset вызван с правильным initiator
    expect(fieldResetSpy).toHaveBeenCalledWith(expect.objectContaining({ initiator: form }));
  });

  test("should trigger effects after resetting fields", async () => {
    // Добавляем поле
    const field = new Uoyroem.Field("field", Uoyroem.Type.text(), { effectManager });
    form.fields.add(field);

    // Мокаем reset для поля
    jest.spyOn(field, "reset").mockReturnValue(new Set());

    // Вызываем reset
    form.reset();

    // Проверяем, что triggerEffects был вызван
    expect(effectManager.triggerEffects).toHaveBeenCalledTimes(1);
  });

  test("should handle empty form with no fields", async () => {
    // Форма без полей
    expect(form.fields.list.length).toBe(0);

    // Вызываем reset
    form.reset();

    // Проверяем, что triggerEffects все равно вызван
    expect(effectManager.triggerEffects).toHaveBeenCalledTimes(1);
  });

  test("should reset field values to their initial values", async () => {
    // Создаем поле с начальным значением
    const field = new Uoyroem.Field("field", Uoyroem.Type.text(), { effectManager });
    field.setInitialValue("initial");
    form.fields.add(field);

    // Устанавливаем новое значение
    field.setValue("changed", { processChanges: true });

    // Проверяем, что значение изменилось
    expect(field.getValue()).toBe("changed");

    // Вызываем reset
    form.reset();

    // Проверяем, что значение сброшено
    expect(field.getValue()).toBe("initial");
  });

  test("should reset field meta values to their initial values", async () => {
    // Создаем поле
    const field = new Uoyroem.Field("field", Uoyroem.Type.text(), { effectManager });
    field.setInitialMetaValue("disabled", false, { resettable: true });
    form.fields.add(field);

    // Устанавливаем новое значение метаданных
    field.setMetaValue("disabled", true, { processChanges: true });

    // Проверяем, что метаданные изменились
    expect(field.getMetaValue("disabled")).toBe(true);

    // Вызываем reset
    form.reset();

    // Проверяем, что метаданные сброшены
    expect(field.getMetaValue("disabled")).toBe(false);
  });
});