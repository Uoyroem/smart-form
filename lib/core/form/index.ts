import { ChangeSet } from "./change-set";
import { DataManager } from "./data-manager";
import { EffectManager } from "./effect-manager";
import { Field } from "./field";
import { FieldElementLinker, FieldLinker } from "./field-linker";
import { Fields } from "./fields";
import { Type } from "./type";
import { getMetaDependencyKey } from "./utils";
export { EffectManager };

// export class FieldArray {
//     constructor(public fieldArray: Field[]) { }

//     getAdapter(outerContext: FieldContext) {
//         return new Proxy(this, {
//             get(target, propertyKey, receiver) {
//                 switch (propertyKey) {
//                     case "self":
//                         return target;
//                     case "context":
//                         return outerContext;
//                     case "getAdapter":
//                         return (innerContext: FieldContext = {}) => target.getAdapter({ ...outerContext, ...innerContext });
//                     case "getValue":
//                         return (innerContext: FieldContext = {}) => target.getValue({ ...outerContext, ...innerContext });
//                     case "getMetaValue":
//                         return (metaKey: string, innerContext: FieldContext = {}) => target.getMetaValue(metaKey, { ...outerContext, ...innerContext });
//                     case "setValue":
//                         return (newValue: any, innerContext: FieldContext = {}) => target.setValue(newValue, { ...outerContext, ...innerContext });
//                     case "setMetaValue":
//                         return (metaKey: string, newValue: any, innerContext: FieldContext = {}) => target.setMetaValue(metaKey, newValue, { ...outerContext, ...innerContext });
//                     default:
//                         const value = Reflect.get(target, propertyKey, receiver);
//                         return typeof value === "function" ? value.bind(target) : value;
//                 }
//             }
//         });
//     }

//     getValue({ stateKey = null, disabledIsNull = true, raw = false }: FieldContext = {}): any {
//         return this.fieldArray.map(field => field.getValue({ stateKey, disabledIsNull, raw })).find(value => value != null);
//     }

//     getMetaValue(metaKey: string, { stateKey = null, raw = false }: FieldContext = {}): any {
//         return this.fieldArray.map(field => field.getMetaValue(metaKey, { stateKey, raw })).find(value => value != null);
//     }

//     setValue(value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FieldContext = {}): Set<string> {
//         return this.fieldArray.map(field => field.setValue(value, { stateKey, initiator, processChanges, raw })).find(changedNames => changedNames.size !== 0) ?? new Set();
//     }

//     setMetaValue(metaKey: string, value: any, { stateKey = null, initiator = null, processChanges = false, raw = false }: FieldContext = {}): Set<string> {
//         return this.fieldArray.map(field => field.setMetaValue(metaKey, value, { stateKey, initiator, processChanges, raw })).find(changedNames => changedNames.size !== 0) ?? new Set();
//     }

//     processChanges(type: FieldChangeType | null = null, dryRun: boolean = false): Set<string> {
//         return this.fieldArray.map(field => field.processChanges(type, dryRun)).find(changedNames => changedNames.size !== 0) ?? new Set();
//     }
// }



export interface SelectOption {
    value: string;
    textContent: string;
    disabled?: boolean;
    selected?: boolean;
}






interface FocusActionClickElement {
    type: "click";
    element: HTMLElement;
}

interface FocusActionCallback {
    type: "callback";
    callback: () => void;
}

type FocusAction = FocusActionClickElement | FocusActionCallback;

export class Form extends EventTarget {
    public form: HTMLFormElement;
    public effectManager: EffectManager;
    public fields: Fields;
    public fieldLinkers: FieldLinker[];
    public changeSet: ChangeSet;
    public dataManager: DataManager;
    public focusActions: FocusAction[];

    constructor({ form, focusActions }: { form: HTMLFormElement, focusActions?: FocusAction[] }) {
        super();
        this.form = form;
        this.changeSet = new ChangeSet();
        this.effectManager = new EffectManager();
        this.dataManager = {} as any;
        this.fields = new Fields();
        this.fieldLinkers = [];
        this.focusActions = focusActions ?? [];
    }

    async setup() {
        if (this.form != null) {
            this.form.classList.add("ss-form");
            this.form.addEventListener("submit", (event) => {
                event.preventDefault();
                this.submit();
            });

            this.form.addEventListener("reset", (event) => {
                event.preventDefault();
                this.reset();
            });

            // this.fields.addEventListener("changes", this._handleChanges);
            // this.registerChangesManager(new FormChangesForRadioManager());
            // this.registerChangesManager(new FormChangesForTriggerEffectsManager());
            this.registerElements();
        }
    }

    async focus() {
        for (const focusAction of this.focusActions) {
            switch (focusAction.type) {
                case "click":
                    focusAction.element.click();
                    break;
                case "callback":
                    focusAction.callback();
                    break;
                default:
                    break;
            }
        }
    }


    switchState(stateKey: string) {
        for (const field of this.fields.list) {
            field.switchState({ stateKey, initiator: this, processChanges: true });
        }
        this.effectManager.triggerEffects();
    }

    getFormData(): Record<string, any> {
        const formData: Record<string, any> = {};
        for (const fieldName of this.fields) {
            formData[fieldName] = this.fields.get(fieldName).getValue();
        }
        return formData;
    }

    updateFormData(formData: Record<string, any>) {
        for (const fieldName of this.fields) {
            if (!(fieldName in formData)) continue;
            this.fields.get(fieldName).setValue(formData[fieldName], { initiator: this, processChanges: true });
        }
        this.effectManager.triggerEffects();
    }

    registerElements(): void {
        for (const element of this.form.elements as any) {
            if (element.name === "") continue;
            const field = new Field(element.name, Type.fromElement(element), { changeSet: this.changeSet, effectManager: this.effectManager });
            const fieldElementLinker = new FieldElementLinker(field, element);
            fieldElementLinker.link();
            this.fieldLinkers.push(fieldElementLinker);
            this.fields.add(field);
        }
    }

    getElement(name: string): Element | RadioNodeList | null {
        return this.form.elements.namedItem(name);
    }

    async submit(): Promise<void> {

    }

    reset(): void {
        for (const field of this.fields.list) {
            field.reset({ initiator: this, processChanges: true });
        }
        this.effectManager.triggerEffects();
    }

    addField(fieldName: string, type: Type): void {
        this.fields.add(new Field(fieldName, type, { changeSet: this.changeSet, effectManager: this.effectManager }));
    }

    addDisableWhenEffect(fieldName: string, disableWhen: () => Promise<boolean> | boolean, dependsOn: string[]): void {
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "disabled"),
            value: {
                type: "disable-when",
                callback: async () => {
                    const disabled = await disableWhen();
                    // console.log(`[Effect.DisableWhen] Field ${fieldName} disabled: `, disabled);
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    return field.setMetaValue("disabled", disabled, { processChanges: true });
                },
            },
            dependsOn,
        });
    }

    addVisibleWhenEffect(fieldName: string, visibleWhen: () => Promise<boolean> | boolean, dependsOn: string[]): void {
        this.addDisableWhenEffect(fieldName, async () => !await visibleWhen(), dependsOn);
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "visible"),
            value: {
                type: "visible-when",
                callback: async () => {
                    const visible = await visibleWhen();
                    // console.log(`[Effect.VisibleWhen] Field ${fieldName} visible: `, visible);
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    return field.setMetaValue("visible", visible, { processChanges: true });
                },
            },
            dependsOn: [getMetaDependencyKey(fieldName, "disabled")]
        });
    }

    addComputedFieldEffect(fieldName: string, fieldType: Type, compute: () => Promise<any> | any, dependsOn: string[]): void {
        this.addField(fieldName, fieldType);
        this.effectManager.registerNode({
            key: fieldName,
            value: {
                type: "computed-field",
                callback: async () => {
                    const value = await compute();
                    const field = this.fields.get(fieldName);
                    return field.setValue(value, { initiator: this, processChanges: true });
                },
            },
            dependsOn
        });
    }

    addFieldAutofillEffect(fieldName: string, autofillWith: () => Promise<any> | any, dependsOn: string[]): void {
        this.effectManager.addDependency(fieldName, getMetaDependencyKey(fieldName, "autofill"));
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "autofill"),
            value: {
                type: "field-autofill",
                callback: async () => {
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    const dirty = field.getMetaValue("dirty");
                    field.setMetaValue("autofill", !dirty);
                    if (dirty) {
                        return field.processChanges();
                    }
                    const value = await autofillWith();
                    // console.log(`[Effect.FieldAutofill] Field ${fieldName} value: `, value);
                    field.setMetaValue("autofill", field.setValue(value).size !== 0);
                    return field.processChanges();
                },
            },
            dependsOn: [getMetaDependencyKey(fieldName, "dirty"), ...dependsOn]
        });
    }

    addSelectOptionsInitializerEffect(fieldName: string, getDefaultOption: () => Promise<SelectOption> | SelectOption, getOptions: () => Promise<SelectOption[]> | SelectOption[], dependsOn: string[]): void {
        this.effectManager.addDependency(getMetaDependencyKey(fieldName, "disabled"), getMetaDependencyKey(fieldName, "options"));
        this.effectManager.registerNode({
            key: getMetaDependencyKey(fieldName, "options"),
            value: {
                type: "select-options-initializer",
                callback: async () => {
                    const defaultOption = await getDefaultOption();
                    const options = await getOptions();
                    const field = this.fields.get(fieldName).getAdapter({ initiator: this });
                    const selectedValue = field.getValue({ disabledIsNull: false, raw: true });
                    field.setValue(selectedValue);
                    field.setMetaValue("disabled", options.length === 0);
                    field.setMetaValue("options", [defaultOption, ...options]);
                    return field.processChanges();
                },
            },
            dependsOn
        });
    }
}