import { Uoyroem } from '../../lib/core/form';

describe('FormField + FormFieldChangeSet Integration', () => {
    let field: Uoyroem.FormField;
    let changeSet: Uoyroem.FormFieldChangeSet;

    beforeEach(() => {
        changeSet = new Uoyroem.FormFieldChangeSet();
        field = new Uoyroem.FormField('test', Uoyroem.FormFieldType.text(), { changeSet });
    });

    it('should track value changes and mark as processed', () => {
        // 1. Устанавливаем значение без обработки
        field.setValue('initial', { raw: true });

        // 2. Проверяем, что изменение есть в ChangeSet
        const changes = changeSet.getFieldChanges(field);
        expect(changes.length).toBe(1);
        expect(changes[0].processed).toBe(false);

        // 3. Обрабатываем изменения
        const changedNames = field.processChanges();

        // 4. Проверяем, что изменение помечено как обработанное
        expect(changes[0].processed).toBe(true);
        expect(changedNames).toEqual(new Set(['test']));
    });

    it('should handle metaValue changes with dependencies', () => {
        // 1. Устанавливаем мета-значение
        const changedNames = field.setMetaValue('disabled', true, {
            raw: true
        });

        // 2. Проверяем, что ChangeSet содержит изменение
        const changes = changeSet.getFieldChanges(field);
        expect(changes.length).toBe(1);
        expect((changes[0] as Uoyroem.MetaValueChange).metaKey).toBe('disabled');

        // 3. Проверяем возвращенные changedNames
        expect(changedNames).toEqual(new Set(['test:disabled']));
    });

    it('should only return last unprocessed changes', () => {
        // 1. Делаем несколько изменений
        field.setValue('first', { raw: true });
        field.setValue('second', { raw: true });

        // 2. Получаем ТОЛЬКО последнее изменение
        const lastChanges = changeSet.getLastFieldChanges(field);
        expect(lastChanges.length).toBe(1);
        expect(lastChanges[0].newValue).toBe('second');
    });

    it('should handle multiple state keys', () => {
        // 1. Создаем второе состояние
        field.switchState('alternative');
        field.setValue('alt-value', { raw: true, stateKey: 'alternative' });

        // 2. Проверяем изолированность состояний
        const defaultStateValue = field.getValue({ stateKey: 'default', raw: true });
        const altStateValue = field.getValue({ stateKey: 'alternative', raw: true });

        expect(defaultStateValue).toBeNull();
        expect(altStateValue).toBe('alt-value');
    });
});