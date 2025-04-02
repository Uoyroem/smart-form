import * as Uoyroem from "../../lib/index";

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


describe('FormField switchState', () => {
    let formField: Uoyroem.FormField;
    let textType: Uoyroem.FormFieldType;

    beforeEach(() => {
        textType = Uoyroem.FormFieldType.text();
        formField = new Uoyroem.FormField('testField', textType);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should switch to existing state and update currentStateKey', () => {
        formField.setValue('value1', { stateKey: 'state1', raw: true });
        formField.switchState({ stateKey: 'state1' });

        expect(formField['_currentStateKey']).toBe('state1');
        expect(formField.getValue({ raw: true })).toBe('value1');
    });

    it('should initialize new state with reset if not initialized', () => {
        const resetSpy = jest.spyOn(formField, 'reset');
        formField.switchState({ stateKey: 'newState' });

        expect(formField['_initializedStateKeys'].has('newState')).toBe(true);
        expect(resetSpy).toHaveBeenCalledWith({ stateKey: 'newState', initiator: null, processChanges: true });
        expect(formField['_currentStateKey']).toBe('newState');
        expect(formField.getValue({ stateKey: 'newState', raw: true })).toBeNull();
    });

    it('should add value change to changeSet when values differ', () => {
        formField.setValue('defaultValue', { stateKey: 'default', raw: true });
        formField.setValue('state1Value', { stateKey: 'state1', raw: true });

        formField.switchState({ stateKey: 'state1' });

        const change = formField.changeSet.getFieldChange(formField, { type: Uoyroem.FormFieldChangeType.Value });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.stateKey).toBe("state1");
        expect(change.oldValue).toBe("defaultValue");
        expect(change.newValue).toBe("state1Value");
    });

    it('should add meta changes to changeSet when meta values differ', () => {
        formField.setMetaValue('disabled', false, { stateKey: 'default', raw: true });
        formField.setMetaValue('disabled', true, { stateKey: 'state1', raw: true });

        formField.switchState({ stateKey: 'state1' });

        const change = formField.changeSet.getFieldChange(formField, { type: Uoyroem.FormFieldChangeType.MetaValue, metaKey: "disabled" });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.stateKey).toBe("state1");
        expect(change.oldValue).toBe(false);
        expect(change.newValue).toBe(true);
        expect(change.metaKey).toBe("disabled");
    });

    it('should not add changes if values and meta are equal', () => {
        formField.setValue('sameValue', { stateKey: 'default', raw: true });
        formField.setValue('sameValue', { stateKey: 'state1', raw: true });
        formField.setMetaValue('disabled', false, { stateKey: 'default', raw: true });
        formField.setMetaValue('disabled', false, { stateKey: 'state1', raw: true });

        const changesBefore = formField.changeSet.getFieldChanges(formField, { onlyCurrentState: false }).length;
        formField.switchState({ stateKey: 'state1' });
        const changesAfter = formField.changeSet.getFieldChanges(formField, { onlyCurrentState: false }).length;
        expect(changesAfter).toBe(changesBefore);
    });

    it('should process changes when processChanges is true', () => {
        formField.setValue('defaultValue', { stateKey: 'default', raw: true });
        formField.setValue('state1Value', { stateKey: 'state1', raw: true });

        const processChangesSpy = jest.spyOn(formField, 'processChanges');
        const listener = jest.fn();
        formField.addEventListener('changes', listener);
        formField.switchState({ stateKey: 'state1', processChanges: true });

        expect(processChangesSpy).toHaveBeenCalled();
        expect(listener).toHaveBeenCalledWith(expect.any(Uoyroem.FormFieldChangesEvent));
        expect(listener.mock.calls[0][0].changes.find((change: Uoyroem.FormFieldChange) => change.field.name === "testField")).toBeTruthy();
    });

    it('should return changed names with dry processing when processChanges', () => {
        formField.setValue('defaultValue', { stateKey: 'default', raw: true });
        formField.setValue('state1Value', { stateKey: 'state1', raw: true });
        const processChangesSpy = jest.spyOn(formField, 'processChanges');

        const changedNames = formField.switchState({ stateKey: 'state1', processChanges: false });

        expect(processChangesSpy).toHaveBeenCalledWith(null, true);
        expect(changedNames).toContain('testField');
    });

    it('should set initiator in changes', () => {
        formField.setValue('defaultValue', { stateKey: 'default', raw: true });
        formField.setValue('state1Value', { stateKey: 'state1', raw: true });

        formField.switchState({ stateKey: 'state1', initiator: 'testInitiator' });

        const valueChange = formField.changeSet.getFieldChange(formField, { type: Uoyroem.FormFieldChangeType.Value })!;
        expect(valueChange.initiator).toBe('testInitiator');
    });
});
