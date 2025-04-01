import { Uoyroem } from '../../lib/core/form';

describe('FormFieldElementLinker', () => {
    let formField: Uoyroem.FormField;
    let inputElement: HTMLInputElement;
    let linker: Uoyroem.FormFieldElementLinker;

    beforeEach(() => {
        // Создаём текстовое поле и input
        formField = new Uoyroem.FormField("username", Uoyroem.FormFieldType.text());
        inputElement = document.createElement("input");
        inputElement.type = "text";
        inputElement.name = "username";

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

        expect(formField.getValue({ raw: true })).toBe("us");
    });
});