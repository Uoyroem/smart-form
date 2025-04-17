import * as Uoyroem from "../../lib/index";

describe('Field', () => {
    let field: Uoyroem.Field;

    // Перед каждым тестом создаем новый экземпляр Field с типом text
    beforeEach(() => {
        const textType = Uoyroem.Type.text();
        field = new Uoyroem.Field('testField', textType);
    });

    // Тесты для getValue
    describe('getValue', () => {
        it('should return null by default', () => {
            const value = field.getValue();
            expect(value).toBeNull();
        });

        it('should return raw value when raw is true', () => {
            field.setValue('rawValue', { raw: true });
            const value = field.getValue({ raw: true });
            expect(value).toBe('rawValue');
        });

        it('should return null if disabled and disabledIsNull is true', () => {
            field.setMetaValue('disabled', true, { raw: true });
            field.setValue('someValue', { raw: true });
            const value = field.getValue({ disabledIsNull: true });
            expect(value).toBeNull();
        });

        it('should return value if disabled but disabledIsNull is false', () => {
            field.setMetaValue('disabled', true, { raw: true });
            field.setValue('someValue', { raw: true });
            const value = field.getValue({ disabledIsNull: false });
            expect(value).toBe('someValue');
        });
    });

    // Тесты для setValue
    describe('setValue', () => {
        it('should set value and return changed names', () => {
            const changedNames = field.setValue('newValue');
            expect(changedNames).toBeInstanceOf(Set);
            expect(changedNames.has('testField')).toBe(true);
            expect(field.getValue()).toBe('newValue');
        });

        it('should not trigger changes if value is the same', () => {
            field.setValue('sameValue', { raw: true });
            const changedNames = field.setValue('sameValue', { raw: true });
            expect(changedNames.size).toBe(0);
        });

        it('should process changes when processChanges is true', () => {
            const listener = jest.fn();
            field.addEventListener('changes', listener);
            field.setValue('processedValue', { processChanges: true });
            expect(listener).toHaveBeenCalled();
            expect(field.getValue()).toBe('processedValue');
        });
    });

    // Тесты для getMetaValue
    describe('getMetaValue', () => {
        it('should return default meta value (false) for disabled', () => {
            const disabled = field.getMetaValue('disabled');
            expect(disabled).toBe(false);
        });

        it('should return null for uninitialized meta key when raw', () => {
            const value = field.getMetaValue('unknownKey', { raw: true });
            expect(value).toBeUndefined();
        });

        it('should return set meta value', () => {
            field.setMetaValue('customKey', 'customValue', { raw: true });
            const value = field.getMetaValue('customKey');
            expect(value).toBe('customValue');
        });
    });

    // Тесты для setMetaValue
    describe('setMetaValue', () => {
        it('should set meta value and return changed names', () => {
            const changedNames = field.setMetaValue('testMeta', 'metaValue');
            expect(changedNames).toBeInstanceOf(Set);
            expect(changedNames.has('testField:testMeta')).toBe(true);
            expect(field.getMetaValue('testMeta')).toBe('metaValue');
        });

        it('should not trigger changes if meta value is the same', () => {
            field.setMetaValue('testMeta', 'sameValue', { raw: true });
            const changedNames = field.setMetaValue('testMeta', 'sameValue', { raw: true });
            expect(changedNames.size).toBe(0);
        });

        it('should process changes when processChanges is true', () => {
            const listener = jest.fn();
            field.addEventListener('changes', listener);
            field.setMetaValue('testMeta', 'processedValue', { processChanges: true });
            expect(listener).toHaveBeenCalled();
            expect(field.getMetaValue('testMeta')).toBe('processedValue');
        });
    });
});

// Описываем тесты для метода Field.getAdapter
describe('Field.getAdapter', () => {
    let field: Uoyroem.Field;
    let textType: Uoyroem.Type;

    // Перед каждым тестом создаем новый экземпляр Field с типом text
    beforeEach(() => {
        textType = Uoyroem.Type.text();
        field = new Uoyroem.Field('testField', textType);
    });

    // Тесты для getAdapter
    describe('getAdapter behavior', () => {
        it('should return a proxy with access to self', () => {
            const adapter = field.getAdapter({});
            expect(adapter.self).toBe(field);
        });

        it('should reflect the provided context', () => {
            const context: Uoyroem.FieldContext = {
                stateKey: 'customState',
                initiator: 'testInitiator',
                processChanges: true,
                disabledIsNull: false,
                raw: true,
            };
            const adapter = field.getAdapter(context);
            expect(adapter.context).toEqual(context);
        });

        it('should override getValue with context', () => {
            field.setValue('initialValue', { raw: true });
            field.setMetaValue('disabled', true, { raw: true });

            const adapter = field.getAdapter({ disabledIsNull: false });
            const value = adapter.getValue();
            expect(value).toBe('initialValue'); // disabledIsNull=false игнорирует disabled
        });

        it('should override setValue with context', () => {
            const adapter = field.getAdapter({ processChanges: true });
            const listener = jest.fn();
            field.addEventListener('changes', listener);

            adapter.setValue('newValue');
            expect(field.getValue()).toBe('newValue');
            expect(listener).toHaveBeenCalled(); // processChanges=true вызывает событие
        });

        it('should override getMetaValue with context', () => {
            field.setMetaValue('testMeta', 'metaValue', { raw: true });
            const adapter = field.getAdapter({ raw: true });
            const metaValue = adapter.getMetaValue('testMeta');
            expect(metaValue).toBe('metaValue');
        });

        it('should override setMetaValue with context', () => {
            const adapter = field.getAdapter({ processChanges: true });
            const listener = jest.fn();
            field.addEventListener('changes', listener);

            adapter.setMetaValue('testMeta', 'newMetaValue');
            expect(field.getMetaValue('testMeta')).toBe('newMetaValue');
            expect(listener).toHaveBeenCalled(); // processChanges=true вызывает событие
        });

        it('should allow nested context overrides', () => {
            const outerAdapter = field.getAdapter({ stateKey: 'outerState', disabledIsNull: true });
            const innerAdapter = outerAdapter.getAdapter({ disabledIsNull: false });
            innerAdapter.reset({ stateKey: "outerState" });
            // Устанавливаем значение с учетом stateKey из outerAdapter
            innerAdapter.setValue('testValue', { raw: true });
            innerAdapter.setMetaValue('disabled', true, { raw: true });

            expect(innerAdapter.context.stateKey).toBe('outerState'); // Унаследовано от outer
            expect(innerAdapter.context.disabledIsNull).toBe(false); // Переопределено в inner
            expect(innerAdapter.getValue()).toBe('testValue'); // disabledIsNull=false игнорирует disabled
        });

        it('should bind methods to the original Field instance', () => {
            const adapter = field.getAdapter({});
            const resetMethod = adapter.reset;
            resetMethod(); // Вызываем без привязки контекста
            expect(field.getValue()).toBeNull(); // reset должен сработать корректно
        });

        it('should handle property access correctly', () => {
            const adapter = field.getAdapter({});
            expect(adapter.name).toBe('testField');
            expect(adapter.type).toBe(textType);
        });
    });
});


describe('Field switchState', () => {
    let formField: Uoyroem.Field;
    let textType: Uoyroem.Type;

    beforeEach(() => {
        textType = Uoyroem.Type.text();
        formField = new Uoyroem.Field('testField', textType);
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
        expect(resetSpy).toHaveBeenCalledWith({ stateKey: 'newState', initiator: null, processChanges: true, full: true });
        expect(formField['_currentStateKey']).toBe('newState');
        expect(formField.getValue({ stateKey: 'newState', raw: true })).toBeNull();
    });

    it('should add value change to changeSet when values differ', () => {
        formField.setValue('defaultValue', { stateKey: 'default', raw: true });
        formField.setValue('state1Value', { stateKey: 'state1', raw: true });

        formField.switchState({ stateKey: 'state1' });

        const change = formField.changeSet.getFieldChange(formField, { type: Uoyroem.FieldChangeType.Value });
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

        const change = formField.changeSet.getFieldChange(formField, { type: Uoyroem.FieldChangeType.MetaValue, metaKey: "disabled" });
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
        expect(listener).toHaveBeenCalledWith(expect.any(Uoyroem.FieldChangesEvent));
        expect(listener.mock.calls[0][0].changes.find((change: Uoyroem.FieldChange) => change.field.name === "testField")).toBeTruthy();
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

        const valueChange = formField.changeSet.getFieldChange(formField, { type: Uoyroem.FieldChangeType.Value })!;
        expect(valueChange.initiator).toBe('testInitiator');
    });
});

describe('Form select one field', () => {
    let field: Uoyroem.Field;
    const defaultOptions = [
        {
            textContent: "Алматы",
            value: "almaty"
        },
        {
            textContent: "Астана",
            value: "astana",
            selected: true
        },
        {
            textContent: "Шымкент",
            value: "shumkent"
        },
    ];
    beforeEach(() => {
        field = new Uoyroem.Field("city", Uoyroem.Type.select());
        field.setMetaValue("options", defaultOptions, { processChanges: true });
    });

    it('should default selected astana', () => {
        expect(field.getValue()).toBe("astana");
    });

    it('should returns default selected if value not in options', () => {
        field.setValue("unkown");
        expect(field.getValue({ raw: true })).toBe("unkown");
        expect(field.getValue()).toBe("astana");
    });

    it("should returns value", () => {
        field.setValue("shumkent");
        expect(field.getValue()).toBe("shumkent");
    });
});

describe('Form select multiple field', () => {
    let field: Uoyroem.Field;
    const defaultOptions = [
        {
            textContent: "John",
            value: "user1"
        },
        {
            textContent: "Dohn",
            value: "user2",
            selected: true
        },
        {
            textContent: "Paul",
            value: "user3"
        },
    ];
    beforeEach(() => {
        field = new Uoyroem.Field("user", Uoyroem.Type.select({ multiple: true }));
        field.setValue([], { processChanges: true });
        field.setMetaValue("options", defaultOptions, { processChanges: true });
    });
    it("should default empty list", () => {
        expect(field.getValue()).toEqual([]);
    });

    it("should return empty list if values not in options", () => {
        field.setValue(["unkown-user-1", "unkown-user-2"], { processChanges: true });
        expect(field.getValue({ raw: true })).toEqual(["unkown-user-1", "unkown-user-2"]);
        expect(field.getValue()).toEqual([]);
    });

    it("should return partial selected values which in options", () => {
        field.setValue(["unkown-user-1", "user2"], { processChanges: true });
        expect(field.getValue({ raw: true })).toEqual(["unkown-user-1", "user2"]);
        expect(field.getValue()).toEqual(["user2"]);
    });
});
