import { Uoyroem } from "../../lib/core/form";

describe("FormFieldsCollection with Radio Buttons", () => {
  let collection: Uoyroem.FormFieldsCollection;
  let radio1: Uoyroem.FormField;
  let radio2: Uoyroem.FormField;

  beforeEach(() => {
    collection = new Uoyroem.FormFieldsCollection();

    // Создаем два радио-поля с одинаковым именем
    radio1 = new Uoyroem.FormField("gender", Uoyroem.FormFieldType.radio());
    radio2 = new Uoyroem.FormField("gender", Uoyroem.FormFieldType.radio());

    // Устанавливаем разные значения
    radio1.setValue("male");
    radio2.setValue("female");

    // Добавляем в коллекцию
    collection.add(radio1);
    collection.add(radio2);
  });

  it("should uncheck other radios when one is checked", () => {
    // Выбираем первый радио-элемент
    radio1.setMetaValue("checked", true, { processChanges: true });
    radio2.setMetaValue("checked", true, { processChanges: true });

    // Проверяем, что второй автоматически сбросился
    expect(radio1.getMetaValue("checked")).toBe(false);
    expect(radio2.getMetaValue("checked")).toBe(true);
  });

  it("should handle multiple radio groups independently", () => {
    const ageRadio1 = new Uoyroem.FormField(
      "age",
      Uoyroem.FormFieldType.radio()
    );
    const ageRadio2 = new Uoyroem.FormField(
      "age",
      Uoyroem.FormFieldType.radio()
    );
    ageRadio1.setValue("18-25");
    ageRadio2.setValue("26-35");
    collection.add(ageRadio1);
    collection.add(ageRadio2);

    // Выбираем разные группы
    radio1.setMetaValue("checked", true);
    ageRadio2.setMetaValue("checked", true);

    expect(radio1.getMetaValue("checked")).toBe(true);
    expect(ageRadio2.getMetaValue("checked")).toBe(true);
    // Проверяем, что другие группы не затронуты
    expect(radio2.getMetaValue("checked")).toBe(false);
    expect(ageRadio1.getMetaValue("checked")).toBe(false);
  });
});

describe("Edge Cases", () => {
  it("should not uncheck non-radio fields with same name", () => {
    const collection = new Uoyroem.FormFieldsCollection();
    const radio = new Uoyroem.FormField("field", Uoyroem.FormFieldType.radio());
    const checkbox = new Uoyroem.FormField(
      "field",
      Uoyroem.FormFieldType.checkbox()
    );

    collection.add(radio);
    collection.add(checkbox);

    checkbox.setMetaValue("checked", true);
    radio.setMetaValue("checked", true);

    // Checkbox не должен сброситься
    expect(checkbox.getMetaValue("checked")).toBe(true);
  });

  it("should handle dynamic radio button additions", () => {
    const collection = new Uoyroem.FormFieldsCollection();
    const radio1 = new Uoyroem.FormField(
      "dynamic",
      Uoyroem.FormFieldType.radio()
    );
    radio1.setMetaValue("checked", true);
    collection.add(radio1);

    const radio2 = new Uoyroem.FormField(
      "dynamic",
      Uoyroem.FormFieldType.radio()
    );
    collection.add(radio2); // Добавляем позже

    expect(radio1.getMetaValue("checked")).toBe(true);
    expect(radio2.getMetaValue("checked")).toBe(false);
  });
});
