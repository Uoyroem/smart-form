import * as Uoyroem from "../../lib/index";


describe('FormFieldElementLinker', () => {
    let formField: Uoyroem.FormField;
    let inputElement: HTMLInputElement;
    let inputElementContainer: HTMLElement;
    let linker: Uoyroem.FormFieldElementLinker;

    it('should throw error if types do not match', () => {
        const field = new Uoyroem.FormField("mismatch", Uoyroem.FormFieldType.text());
        const selectElement = document.createElement("select");
        selectElement.name = "mismatch";

        expect(() => new Uoyroem.FormFieldElementLinker(field, selectElement)).toThrow();
    });

    beforeEach(() => {
        // Создаём текстовое поле и input
        formField = new Uoyroem.FormField("username", Uoyroem.FormFieldType.text());
        document.body.innerHTML = `
            <div>
                <input id="username-input" type="text" name="username"/>
            </div>
        `;
        inputElement = document.getElementById("username-input") as HTMLInputElement;

        linker = new Uoyroem.FormFieldElementLinker(formField, inputElement);
    });

    it('should link field to element and sync initial value', () => {
        // Устанавливаем начальное значение в элемент
        inputElement.value = "test-user";
        linker.link();

        // Проверяем, что значение синхронизировалось в FormField
        expect(formField.getValue({ raw: true })).toBe("test-user");
    });

    it('should sync value from field to element', () => {
        linker.link();

        // Меняем значение в FormField
        formField.setValue("new-value", { raw: true, processChanges: true });

        // Проверяем, что элемент обновился
        expect(inputElement.value).toBe("new-value");
    });

    it('should sync value from element to field on input', () => {
        linker.link();

        // Эмулируем ввод в input
        inputElement.value = "user-typed";
        inputElement.dispatchEvent(new InputEvent("input"));

        // Проверяем, что FormField получил новое значение
        expect(formField.getValue({ raw: true })).toBe("user-typed");
    });

    it('should handle disabled state', () => {
        linker.link();

        // Отключаем поле
        formField.setMetaValue("disabled", true, { raw: true, processChanges: true });

        // Проверяем, что элемент тоже отключился
        expect(inputElement.disabled).toBe(true);
    });

    it('should unlink and stop syncing', () => {
        linker.link();
        linker.unlink();

        // Меняем значение в FormField
        formField.setValue("should-not-sync", { raw: true, processChanges: true });

        // Проверяем, что элемент НЕ обновился
        expect(inputElement.value).not.toBe("should-not-sync");
    });

    it('should sync visible meta to element', () => {
        linker.link();
        formField.setMetaValue("visible", false, { raw: true, processChanges: true });
        const container = formField.getMetaValue("container");
        container.dispatchEvent(new Event('transitionend'));
        
        // Предполагаем, что изменение `visible` влияет на атрибут или стиль
        expect(container.style.display).toBe("none"); // Или другой ожидаемый эффект
    });
});

describe('FormFieldElementLinker (Radio)', () => {
    let formField: Uoyroem.FormField;
    let radioElement: HTMLInputElement;
    let linker: Uoyroem.FormFieldElementLinker;

    beforeEach(() => {
        formField = new Uoyroem.FormField("gender", Uoyroem.FormFieldType.radio());
        radioElement = document.createElement("input");
        radioElement.type = "radio";
        radioElement.name = "gender";
        radioElement.value = "male";

        linker = new Uoyroem.FormFieldElementLinker(formField, radioElement);
        linker.link();
    });

    it('should sync checked state to field when selected', () => {
        radioElement.checked = true;
        radioElement.dispatchEvent(new Event("change"));

        expect(formField.getMetaValue("checked")).toBe(true);
        expect(formField.getValue()).toBe("male");
    });

    it('should sync unchecked state to field', () => {
        radioElement.checked = false;
        radioElement.dispatchEvent(new Event("change"));

        expect(formField.getMetaValue("checked")).toBe(false);
        expect(formField.getValue()).toBe(null); // Нет выбора
    });

    it('should update element when field value matches', () => {
        formField.setValue("male", { processChanges: true });
        expect(radioElement.checked).toBe(true);
    });

    it('should not check element if value does not match', () => {
        formField.setValue("female", { processChanges: true });
        expect(radioElement.checked).toBe(false);
    });
});

describe('FormFieldElementLinker (Checkbox)', () => {
    let formField: Uoyroem.FormField;
    let checkboxElement: HTMLInputElement;
    let linker: Uoyroem.FormFieldElementLinker;

    beforeEach(() => {
        formField = new Uoyroem.FormField("agree", Uoyroem.FormFieldType.checkbox());
        checkboxElement = document.createElement("input");
        checkboxElement.type = "checkbox";
        checkboxElement.name = "agree";

        linker = new Uoyroem.FormFieldElementLinker(formField, checkboxElement);
        linker.link();
    });

    it('should sync checked state to field', () => {
        checkboxElement.checked = true;
        checkboxElement.dispatchEvent(new Event("change"));

        expect(formField.getMetaValue("checked")).toBe(true);
        expect(formField.getValue()).toBe(true); // Для чекбокса значение === checked
    });

    it('should handle unchecked state', () => {
        checkboxElement.checked = false;
        checkboxElement.dispatchEvent(new Event("change"));

        expect(formField.getMetaValue("checked")).toBe(false);
        expect(formField.getValue()).toBe(false);
    });
});

describe('FormFieldElementLinker (Select)', () => {
    let formField: Uoyroem.FormField;
    let selectElement: HTMLSelectElement;
    let linker: Uoyroem.FormFieldElementLinker;

    beforeEach(() => {
        formField = new Uoyroem.FormField("country", Uoyroem.FormFieldType.select());
        selectElement = document.createElement("select");
        selectElement.name = "country";

        // Добавляем опции
        const option1 = document.createElement("option");
        option1.value = "ru";
        option1.textContent = "Russia";
        selectElement.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = "us";
        option2.textContent = "USA";
        selectElement.appendChild(option2);

        linker = new Uoyroem.FormFieldElementLinker(formField, selectElement);
        linker.link();
    });

    it('should sync selected value to field', () => {
        selectElement.value = "us";
        selectElement.dispatchEvent(new Event("change"));

        expect(formField.getValue()).toBe("us");
    });
});

describe('FormFieldElementLinker (Select Multiple)', () => {
    let formField: Uoyroem.FormField;
    let selectElement: HTMLSelectElement;
    let linker: Uoyroem.FormFieldElementLinker;

    beforeEach(() => {
        formField = new Uoyroem.FormField("fruits", Uoyroem.FormFieldType.select({ multiple: true }));
        selectElement = document.createElement("select");
        selectElement.name = "fruits";
        selectElement.multiple = true;

        ["apple", "banana", "cherry"].forEach(fruit => {
            const option = document.createElement("option");
            option.value = fruit;
            option.textContent = fruit;
            selectElement.appendChild(option);
        });

        linker = new Uoyroem.FormFieldElementLinker(formField, selectElement);
        linker.link();
    });

    it('should sync multiple selected values to field', () => {
        selectElement.options[0].selected = true; // apple
        selectElement.options[2].selected = true; // cherry
        selectElement.dispatchEvent(new Event("change"));

        expect(formField.getValue()).toEqual(["apple", "cherry"]);
    });

    it('should sync multiple values from field to element', () => {
        formField.setValue(["banana", "cherry"], { processChanges: true });

        expect(selectElement.options[1].selected).toBe(true); // banana
        expect(selectElement.options[2].selected).toBe(true); // cherry
        expect(selectElement.options[0].selected).toBe(false); // apple
    });
});

describe('FormFieldElementLinker (Number)', () => {
    let formField: Uoyroem.FormField;
    let numberElement: HTMLInputElement;
    let linker: Uoyroem.FormFieldElementLinker;

    beforeEach(() => {
        formField = new Uoyroem.FormField("age", Uoyroem.FormFieldType.number());
        numberElement = document.createElement("input");
        numberElement.type = "number";
        numberElement.name = "age";

        linker = new Uoyroem.FormFieldElementLinker(formField, numberElement);
        linker.link();
    });

    it('should sync numeric value from field to element', () => {
        formField.setValue(25, { raw: true, processChanges: true });
        expect(numberElement.value).toBe("25");
    });

    it('should sync numeric value from element to field', () => {
        numberElement.value = "30";
        numberElement.dispatchEvent(new InputEvent("input"));
        expect(formField.getValue({ raw: true })).toBe("30");
    });
});