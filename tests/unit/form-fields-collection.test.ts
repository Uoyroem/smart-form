import { Uoyroem } from "../../lib/core/form";

describe("FormFieldsCollection with Radio Buttons", () => {
    let collection: Uoyroem.FormFieldsCollection;
    let maleRadio: Uoyroem.FormField;
    let femaleRadio: Uoyroem.FormField;

    beforeEach(() => {
        collection = new Uoyroem.FormFieldsCollection();

        // Создаем два радио-поля с одинаковым именем
        maleRadio = new Uoyroem.FormField("gender", Uoyroem.FormFieldType.radio());
        femaleRadio = new Uoyroem.FormField(
            "gender",
            Uoyroem.FormFieldType.radio()
        );

        // Устанавливаем разные значения
        maleRadio.setValue("male", { typed: false });
        femaleRadio.setValue("female", { typed: false });

        // Добавляем в коллекцию
        collection.add(maleRadio);
        collection.add(femaleRadio);
    });

    it("should uncheck other radios when one is checked", () => {
        // Выбираем первый радио-элемент
        collection.get("gender").setValue("male", { processChanges: true });
        collection.get("gender").setValue("female", { processChanges: true });

        // Проверяем, что второй автоматически сбросился
        expect(maleRadio.getMetaValue("checked")).toBe(false);
        expect(femaleRadio.getMetaValue("checked")).toBe(true);
        expect(collection.get("gender").getValue()).toBe("female");
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
        maleRadio.setMetaValue("checked", true, { processChanges: true });
        femaleRadio.setMetaValue("checked", true, { processChanges: true });
        ageRadio1.setMetaValue("checked", true, { processChanges: true });
        ageRadio2.setMetaValue("checked", true, { processChanges: true });

        expect(maleRadio.getMetaValue("checked")).toBe(false);
        expect(ageRadio2.getMetaValue("checked")).toBe(true);
        // Проверяем, что другие группы не затронуты
        expect(femaleRadio.getMetaValue("checked")).toBe(true);
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

        checkbox.setMetaValue("checked", true, { processChanges: true });
        radio.setMetaValue("checked", true, { processChanges: true });

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
