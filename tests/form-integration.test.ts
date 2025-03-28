import { Uoyroem } from "../lib/core/form";

describe("Uoyroem.Form Integration", () => {
  let form: Uoyroem.Form;

  beforeAll(() => {
    document.body.innerHTML = `
      <form id="test-form">
        <input type="text" name="email">
      </form>
    `;

    const formElement = document.getElementById("test-form") as HTMLFormElement;
    form = new Uoyroem.Form({ form: formElement });
  });

  test("should bind form elements", async () => {
    await form.setup();
    expect(form.fields.get("email")).toBeInstanceOf(Uoyroem.FormField);
  });
});
