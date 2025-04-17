import { FormElement_ as Element } from "./element";
import { Field } from "./field";
import { Type } from "./type";

export abstract class FieldLinker {
    public field: Field;
    public type: Type;

    constructor(field: Field) {
        this.field = field;
        this.type = field.type;
    }

    abstract link(): void;
    abstract unlink(): void;
}

export class FieldElementLinker extends FieldLinker {
    public element: Element;
    private _handleHideContainer: ((event: Event) => void) | null;
    /**
     * 
     * @param {Field} field 
     * @param {Element} element 
     */
    constructor(field: Field, element: Element) {
        super(field);
        this.element = element;
        if (this.type.asElementType() !== this.element.type) {
            throw new Error("For link type is equal")
        }
        this._fieldChangesEventListener = this._fieldChangesEventListener.bind(this);
        this._elementValueInputEventListener = this._elementValueInputEventListener.bind(this);
        this._elementValueChangeEventListener = this._elementValueChangeEventListener.bind(this);
        this._handleHideContainer = null;
    }

    override link(): void {
        this.field.setInitialValue(this._getElementValue());
        this.field.setInitialMetaValue("disabled", this._getElementMetaValue("disabled"), { resettable: false });
        this.field.setInitialMetaValue("container", this.element.parentElement, { resettable: false });
        if (["radio", "checkbox"].includes(this.type.asElementType())) {
            this.field.setInitialMetaValue("checked", this._getElementMetaValue("checked"));
        }
        if (["select-one", "select-multiple"].includes(this.type.asElementType())) {
            this.field.setInitialMetaValue("options", this._getElementMetaValue("options"), { resettable: false })
        }
        this.field.reset({ processChanges: true, initiator: this, full: true });

        this.field.addEventListener("changes", this._fieldChangesEventListener);
        if (["text", "number", "textarea"].includes(this.type.asElementType())) {
            this.element.addEventListener("input", this._elementValueInputEventListener);
        } else {
            this.element.addEventListener("change", this._elementValueChangeEventListener);
        }
    }

    override unlink(): void {
        this.field.removeEventListener("changes", this._fieldChangesEventListener);
        if (["text", "number", "textarea"].includes(this.type.asElementType())) {
            this.element.removeEventListener("input", this._elementValueInputEventListener);
        } else {
            this.element.removeEventListener("change", this._elementValueChangeEventListener);
        }
    }

    _elementValueInputEventListener(event: Event): void {
        console.log("[FieldElementLinker._elementValueInputEventListener] Event")
        this.field.setMetaValue("dirty", true, { initiator: this, processChanges: true });
        this._syncFieldValue();
    }

    _elementValueChangeEventListener(event: Event): void {
        this.field.setMetaValue("dirty", true, { initiator: this, processChanges: true });
        if (["radio", "checkbox"].includes(this.type.asElementType())) {
            this._syncFieldMetaValue("checked");
        } else {
            this._syncFieldValue();
        }
    }

    _fieldChangesEventListener(event: Event) {
        const changes = (event as FieldChangesEvent).changes.filter(change => change.initiator !== this);
        for (const change of changes) {
            if (change.type === FieldChangeType.Value) {
                this._syncElementValue();
            } else if (change.type === FieldChangeType.MetaValue) {
                this._syncElementMetaValue(change.metaKey);
            }
        }
    }

    _syncElementValue(): void {
        console.log("[FieldElementLinker._syncElementValue] Syncing element value");
        const value = this.field.getValue({ raw: true });
        const status = this.type.setElementValue(this.element, value);
        if (status !== TypeElementStatus.VALUE_SET_SUCCESS) {
            console.log("[FieldElementLinker._syncElementMetaValue] Failed to set element value, status `%s`", status);
            return;
        }
    }

    _getElementValue(): any {
        const [value, status] = this.type.getElementValue(this.element);
        if (status !== TypeElementStatus.VALUE_SUCCESSFULLY_RECEIVED) {
            console.warn("[FieldElementLinker._getElementValue] Failed to get value from element, status `%s`", status);
        }
        return value;
    }

    _syncFieldValue(): void {
        console.log("[FieldElementLinker._syncFieldValue] Syncing field value");
        this.field.setValue(this._getElementValue(), { initiator: this, processChanges: true, raw: true });
    }

    _syncElementMetaValue(metaKey: string): void {
        console.log("[FieldElementLinker._syncElementMetaValue] Syncing element meta value");
        const value = this.field.getMetaValue(metaKey, { raw: true });
        const status = this.type.setElementMetaValue(this.element, metaKey, value);
        if (status === TypeElementStatus.META_VALUE_SET_SUCCESS) {
            switch (metaKey) {
                case "options":
                    if (value.length !== 0) {
                        this._syncElementValue();
                    }
            }
            return;
        }
        if (status === TypeElementStatus.META_KEY_NOT_EXISTS) {
            switch (metaKey) {
                case "visible":
                    const container = this.field.getMetaValue("container") as HTMLElement;
                    if (this._handleHideContainer != null) {
                        container.removeEventListener("transitionend", this._handleHideContainer);
                        this._handleHideContainer = null;
                    }
                    if (value) {
                        if (container.style.display === "none") {
                            container.style.display = "";
                            requestAnimationFrame(() => {
                                container.dataset.visible = "true";
                            });
                        } else {
                            container.dataset.visible = "true";
                        }
                    } else {
                        if (isVisible(container)) {
                            if (container.style.display !== "none") {
                                this._handleHideContainer = (event: Event) => {
                                    container.style.display = "none";
                                };
                                container.addEventListener("transitionend", this._handleHideContainer, { once: true });
                            }
                        } else {
                            container.style.display = "none";
                        }
                        container.dataset.visible = "false";
                    }
                    break;

                case "options":
                    if (value.length !== 0) {
                        this._syncElementValue();
                    }
                    break;
            }
            return;
        }

        console.log("[FieldElementLinker._syncElementMetaValue] Failed to set element meta value, status `%s`", status);
    }

    _getElementMetaValue(metaKey: string): any {
        const [value, status] = this.type.getElementMetaValue(this.element, metaKey);
        if (status !== TypeElementStatus.META_VALUE_SUCCESSFULLY_RECEIVED) {
            console.warn("[FieldElementLinker._getElementMetaValue] Failed to get value from element, status `%s`", status);
        }
        return value;
    }

    _syncFieldMetaValue(metaKey: string): void {
        console.log("[FieldElementLinker._syncFieldMeta] Syncing field meta value");
        this.field.setMetaValue(metaKey, this._getElementMetaValue(metaKey), { initiator: this, processChanges: true });
    }
}