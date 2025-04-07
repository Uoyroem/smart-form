import * as Uoyroem from "../../lib/index";


describe('FormField + FormFieldChangeSet Integration', () => {
    let field: Uoyroem.FormField;
    let changeSet: Uoyroem.FormFieldChangeSet;

    beforeEach(() => {
        changeSet = new Uoyroem.FormFieldChangeSet();
        field = new Uoyroem.FormField('test', Uoyroem.FormFieldType.text(), { changeSet });
    });

    it('should track value changes and mark as processed', async () => {
        // 1. Устанавливаем значение без обработки
        field.setValue('initial', { raw: true });

        // 2. Проверяем, что изменение есть в ChangeSet
        const change = changeSet.getFieldChange(field, { type: Uoyroem.FormFieldChangeType.Value });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.newValue).toBe("initial");
        expect(change.processed).toBe(false);

        // 3. Обрабатываем изменения
        const changedNames = await field.processChanges();

        // 4. Проверяем, что изменение помечено как обработанное
        expect(change.processed).toBe(true);
        expect(changedNames).toEqual(new Set(['test']));
    });

    it('should handle metaValue changes with dependencies', async () => {
        // 1. Устанавливаем мета-значение
        const changedNames = await field.setMetaValue('disabled', true, { raw: true });
        expect(changedNames).toEqual(new Set(['test:disabled']));

        const change = changeSet.getFieldChange(field, { type: Uoyroem.FormFieldChangeType.MetaValue });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.metaKey).toBe('disabled');
    });

    it('should only return last unprocessed changes', async () => {
        // 1. Делаем несколько изменений
        await field.setValue('first', { raw: true });
        await field.setValue('second', { raw: true });

        // 2. Получаем ТОЛЬКО последнее изменение
        const change = changeSet.getFieldChange(field, { type: Uoyroem.FormFieldChangeType.Value });
        expect(change).not.toBeUndefined();
        if (change === undefined) return;
        expect(change.newValue).toBe("second");
    });

    it('should handle multiple state keys', async () => {
        // 1. Создаем второе состояние
        await field.switchState({ stateKey: 'alternative' });
        await field.setValue('alt-value', { raw: true, stateKey: 'alternative' });

        // 2. Проверяем изолированность состояний
        expect(await field.getValue({ stateKey: 'default', raw: true })).toBeNull();
        expect(await field.getValue({ stateKey: 'alternative', raw: true })).toBe('alt-value');
    });
});