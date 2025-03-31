import { Uoyroem } from "../../lib/core/form";

describe("Form with Radio Buttons", () => {
  let form: Uoyroem.Form;
  let genderField: Uoyroem.FormFieldArray;

  beforeEach(async () => {
      document.body.innerHTML = `
          <form id="test-form">
              <input type="radio" name="gender" value="male">
              <input type="radio" name="gender" value="female">
          </form>
      `;

      form = new Uoyroem.Form({ form: document.forms.namedItem("test-form")! });
      await form.setup();
      genderField = form.fields.get("gender") as Uoyroem.FormFieldArray;
  });

  it("should uncheck other radios when one is checked", () => {
      // Выбираем первый радио-элемент
      genderField.setValue("male", { processChanges: true });
      genderField.setValue("female", { processChanges: true });

      // Проверяем, что второй автоматически сбросился
      expect(genderField.getValue()).toBe("female");
  });
});
