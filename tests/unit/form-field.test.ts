import { Uoyroem } from "../../lib/core/form";

describe('FormField', () => {
    let formField: Uoyroem.FormField;

    // Перед каждым тестом создаем новый экземпляр FormField с типом text
    beforeEach(() => {
        const textType = Uoyroem.FormFieldType.text();
        formField = new Uoyroem.FormField('testField', textType);
    });

    // Тесты для getValue
    describe('getValue', () => {
        it('should return null by default', () => {
            const value = formField.getValue();
            expect(value).toBeNull();
        });

        it('should return raw value when raw is true', () => {
            formField.setValue('rawValue', { raw: true });
            const value = formField.getValue({ raw: true });
            expect(value).toBe('rawValue');
        });

        it('should return null if disabled and disabledIsNull is true', () => {
            formField.setMetaValue('disabled', true, { raw: true });
            formField.setValue('someValue', { raw: true });
            const value = formField.getValue({ disabledIsNull: true });
            expect(value).toBeNull();
        });

        it('should return value if disabled but disabledIsNull is false', () => {
            formField.setMetaValue('disabled', true, { raw: true });
            formField.setValue('someValue', { raw: true });
            const value = formField.getValue({ disabledIsNull: false });
            expect(value).toBe('someValue');
        });
    });

    // Тесты для setValue
    describe('setValue', () => {
        it('should set value and return changed names', () => {
            const changedNames = formField.setValue('newValue');
            expect(changedNames).toBeInstanceOf(Set);
            expect(changedNames.has('testField')).toBe(true);
            expect(formField.getValue()).toBe('newValue');
        });

        it('should not trigger changes if value is the same', () => {
            formField.setValue('sameValue', { raw: true });
            const changedNames = formField.setValue('sameValue', { raw: true });
            expect(changedNames.size).toBe(0);
        });

        it('should process changes when processChanges is true', () => {
            const listener = jest.fn();
            formField.addEventListener('changes', listener);
            formField.setValue('processedValue', { processChanges: true });
            expect(listener).toHaveBeenCalled();
            expect(formField.getValue()).toBe('processedValue');
        });
    });

    // Тесты для getMetaValue
    describe('getMetaValue', () => {
        it('should return default meta value (false) for disabled', () => {
            const disabled = formField.getMetaValue('disabled');
            expect(disabled).toBe(false);
        });

        it('should return null for uninitialized meta key when raw', () => {
            const value = formField.getMetaValue('unknownKey', { raw: true });
            expect(value).toBeUndefined();
        });

        it('should return set meta value', () => {
            formField.setMetaValue('customKey', 'customValue', { raw: true });
            const value = formField.getMetaValue('customKey');
            expect(value).toBe('customValue');
        });
    });

    // Тесты для setMetaValue
    describe('setMetaValue', () => {
        it('should set meta value and return changed names', () => {
            const changedNames = formField.setMetaValue('testMeta', 'metaValue');
            expect(changedNames).toBeInstanceOf(Set);
            expect(changedNames.has('testField:testMeta')).toBe(true);
            expect(formField.getMetaValue('testMeta')).toBe('metaValue');
        });

        it('should not trigger changes if meta value is the same', () => {
            formField.setMetaValue('testMeta', 'sameValue', { raw: true });
            const changedNames = formField.setMetaValue('testMeta', 'sameValue', { raw: true });
            expect(changedNames.size).toBe(0);
        });

        it('should process changes when processChanges is true', () => {
            const listener = jest.fn();
            formField.addEventListener('changes', listener);
            formField.setMetaValue('testMeta', 'processedValue', { processChanges: true });
            expect(listener).toHaveBeenCalled();
            expect(formField.getMetaValue('testMeta')).toBe('processedValue');
        });
    });
});

// Описываем тесты для метода FormField.getAdapter
describe('FormField.getAdapter', () => {
    let formField: Uoyroem.FormField;
    let textType: Uoyroem.FormFieldType;

    // Перед каждым тестом создаем новый экземпляр FormField с типом text
    beforeEach(() => {
        textType = Uoyroem.FormFieldType.text();
        formField = new Uoyroem.FormField('testField', textType);
    });

    // Тесты для getAdapter
    describe('getAdapter behavior', () => {
        it('should return a proxy with access to self', () => {
            const adapter = formField.getAdapter({});
            expect(adapter.self).toBe(formField);
        });

        it('should reflect the provided context', () => {
            const context: Uoyroem.FormFieldContext = {
                stateKey: 'customState',
                initiator: 'testInitiator',
                processChanges: true,
                disabledIsNull: false,
                raw: true,
            };
            const adapter = formField.getAdapter(context);
            expect(adapter.context).toEqual(context);
        });

        it('should override getValue with context', () => {
            formField.setValue('initialValue', { raw: true });
            formField.setMetaValue('disabled', true, { raw: true });

            const adapter = formField.getAdapter({ disabledIsNull: false });
            const value = adapter.getValue();
            expect(value).toBe('initialValue'); // disabledIsNull=false игнорирует disabled
        });

        it('should override setValue with context', () => {
            const adapter = formField.getAdapter({ processChanges: true });
            const listener = jest.fn();
            formField.addEventListener('changes', listener);

            adapter.setValue('newValue');
            expect(formField.getValue()).toBe('newValue');
            expect(listener).toHaveBeenCalled(); // processChanges=true вызывает событие
        });

        it('should override getMetaValue with context', () => {
            formField.setMetaValue('testMeta', 'metaValue', { raw: true });
            const adapter = formField.getAdapter({ raw: true });
            const metaValue = adapter.getMetaValue('testMeta');
            expect(metaValue).toBe('metaValue');
        });

        it('should override setMetaValue with context', () => {
            const adapter = formField.getAdapter({ processChanges: true });
            const listener = jest.fn();
            formField.addEventListener('changes', listener);

            adapter.setMetaValue('testMeta', 'newMetaValue');
            expect(formField.getMetaValue('testMeta')).toBe('newMetaValue');
            expect(listener).toHaveBeenCalled(); // processChanges=true вызывает событие
        });

        it('should allow nested context overrides', () => {
            const outerAdapter = formField.getAdapter({ stateKey: 'outerState', disabledIsNull: true });
            const innerAdapter = outerAdapter.getAdapter({ disabledIsNull: false });
            innerAdapter.reset({ stateKey: "outerState" });
            // Устанавливаем значение с учетом stateKey из outerAdapter
            innerAdapter.setValue('testValue', { raw: true });
            innerAdapter.setMetaValue('disabled', true, { raw: true });

            expect(innerAdapter.context.stateKey).toBe('outerState'); // Унаследовано от outer
            expect(innerAdapter.context.disabledIsNull).toBe(false); // Переопределено в inner
            expect(innerAdapter.getValue()).toBe('testValue'); // disabledIsNull=false игнорирует disabled
        });

        it('should bind methods to the original FormField instance', () => {
            const adapter = formField.getAdapter({});
            const resetMethod = adapter.reset;
            resetMethod(); // Вызываем без привязки контекста
            expect(formField.getValue()).toBeNull(); // reset должен сработать корректно
        });

        it('should handle property access correctly', () => {
            const adapter = formField.getAdapter({});
            expect(adapter.name).toBe('testField');
            expect(adapter.type).toBe(textType);
        });
    });
});
