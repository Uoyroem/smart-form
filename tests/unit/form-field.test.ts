import { Uoyroem } from "../../lib/core/form";

describe("Uoyroem.FormField", () => {
    let field: Uoyroem.FormField;
    const textType = Uoyroem.FormFieldType.text();

    beforeEach(() => {
        field = new Uoyroem.FormField("username", textType);
    });

    test("should initialize with null value", () => {
        expect(field.getValue()).toBeNull();
    });

    test("should initialize with null value", () => {
        field.initialValue((setValue) => {
            setValue("blyat");
        });
        field.reset();
        expect(field.getValue()).toBe("blyat");
    });

    test("should set and get value correctly", () => {
        field.setValue("test@example.com");
        expect(field.getValue()).toBe("test@example.com");
    });

    test("should handle meta values", () => {
        field.setMetaValue("disabled", true);
        expect(field.getMetaValue("disabled")).toBe(true);
    });
});
