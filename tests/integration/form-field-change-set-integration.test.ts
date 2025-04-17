import * as Uoyroem from "../../lib/index";


describe('Field + ChangeSet Integration', () => {
    let field: Uoyroem.Field;
    let changeSet: Uoyroem.ChangeSet;

    beforeEach(() => {
        changeSet = new Uoyroem.ChangeSet();
        field = new Uoyroem.Field('test', Uoyroem.Type.text(), { changeSet });
    });

    it('should track value changes and mark as processed', () => {
        // 1. Устанавливаем значение без обработки
        field.setValue('initial', { raw: true });

        // 2. Проверяем, что изменение есть в ChangeSet
        const change = changeSet.getFieldChange(field, { type: Uoyroem.FieldChangeType.Value });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.newValue).toBe("initial");
        expect(change.processed).toBe(false);

        // 3. Обрабатываем изменения
        const changedNames = field.processChanges();

        // 4. Проверяем, что изменение помечено как обработанное
        expect(change.processed).toBe(true);
        expect(changedNames).toEqual(new Set(['test']));
    });

    it('should handle metaValue changes with dependencies', () => {
        // 1. Устанавливаем мета-значение
        const changedNames = field.setMetaValue('disabled', true, { raw: true });
        expect(changedNames).toEqual(new Set(['test:disabled']));

        const change = changeSet.getFieldChange(field, { type: Uoyroem.FieldChangeType.MetaValue });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.metaKey).toBe('disabled');
    });

    it('should only return last unprocessed changes', () => {
        // 1. Делаем несколько изменений
        field.setValue('first', { raw: true });
        field.setValue('second', { raw: true });

        // 2. Получаем ТОЛЬКО последнее изменение
        const change = changeSet.getFieldChange(field, { type: Uoyroem.FieldChangeType.Value });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.newValue).toBe("second");
    });

    it('should handle multiple state keys', () => {
        // 1. Создаем второе состояние
        field.switchState({ stateKey: 'alternative' });
        field.setValue('alt-value', { raw: true, stateKey: 'alternative' });

        // 2. Проверяем изолированность состояний
        expect(field.getValue({ stateKey: 'default', raw: true })).toBeNull();
        expect(field.getValue({ stateKey: 'alternative', raw: true })).toBe('alt-value');
    });
});