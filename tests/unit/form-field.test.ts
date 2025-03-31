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

    test("should handle meta values", () => {
        field.setMetaValue("disabled", true);
        expect(field.getMetaValue("disabled")).toBe(true);
    });

    test("should set and get value correctly", () => {
        field.setValue("test@example.com");
        expect(field.getValue()).toBe("test@example.com");
    });

    it("should respect disabled state", () => {
        const field = new Uoyroem.FormField("test", Uoyroem.FormFieldType.text());
        field.setMetaValue("disabled", true);
        expect(field.getValue({ disabledIsNull: true })).toBeNull();

        field.setValue("value");
        expect(field.getValue({ disabledIsNull: false })).toBe("value");
    });

    it("should track changes in changeSet", () => {
        field.setValue("Uoyroem", { processChanges: true, initiator: 1 });
        const changes = field.changeSet.getLastFieldChanges(field);
        expect(changes).toHaveLength(1);
        const change = changes[0];
        expect(change.type).toBe(Uoyroem.ChangeType.VALUE);
        expect(change.field).toBe(field);
        expect(change.initiator).toBe(1);
        expect(change.oldValue).toBeNull();
        expect(change.newValue).toBe("Uoyroem");
    });
});
