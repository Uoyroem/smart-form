import * as Uoyroem from "../../lib/index";


describe("Form with Radio Buttons", () => {
  let form: Uoyroem.Form;
  let maleRadioField: Uoyroem.FormField;
  let femaleRadioField: Uoyroem.FormField;

  beforeEach(async () => {
    form = new Uoyroem.Form({ form: document.createElement("form") });
    await form.setup();

    maleRadioField = new Uoyroem.FormField("gender", Uoyroem.FormFieldType.radio(), { changeSet: form.changeSet, effectManager: form.effectManager });
    await maleRadioField.setValue("male", { raw: true, processChanges: true });
    form.fields.add(maleRadioField);

    femaleRadioField = new Uoyroem.FormField("gender", Uoyroem.FormFieldType.radio(), { changeSet: form.changeSet, effectManager: form.effectManager });
    await femaleRadioField.setValue("female", { raw: true, processChanges: true });
    form.fields.add(femaleRadioField);
  });

  it("should uncheck other radios when one is checked", async () => {
    await maleRadioField.setMetaValue("checked", true, { processChanges: true });
    await femaleRadioField.setMetaValue("checked", true, { processChanges: true });

    expect(await maleRadioField.getMetaValue("checked")).toBe(false);
    expect(await femaleRadioField.getMetaValue("checked")).toBe(true);

    expect(await form.fields.get("gender").getValue()).toBe("female");
  });
});
