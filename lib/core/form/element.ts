
import IMask from 'imask';

export class Element {
    constructor(public readonly target: globalThis.Element) { }
}

export class MaskedElement {

}

IMask(new HTMLInputElement(), { mask: Number }).unmaskedValue