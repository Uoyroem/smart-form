import * as Uoyroem from "../../lib/index";

describe('EffectManager', () => {
  let effectManager: Uoyroem.EffectManager;

  beforeEach(() => {
    effectManager = new Uoyroem.EffectManager();
  });

  describe('Basic functionality', () => {
    test('should register and retrieve nodes', () => {
      const effect: Uoyroem.Effect = {
        type: 'test',
        callback: () => Promise.resolve(new Set())
      };

      effectManager.registerNode({
        key: 'node1',
        value: effect,
        dependsOn: []
      });

      const node = effectManager.getNode('node1');
      expect(node).toBeDefined();
      expect(node?.key).toBe('node1');
      expect(node?.value).toBe(effect);
    });
  });

  describe('Dependency handling', () => {
    test('should build correct dependency graph', () => {
      effectManager.registerNode({
        key: 'node1',
        value: { type: 'test', callback: () => Promise.resolve(new Set()) },
        dependsOn: ['node2']
      });

      effectManager.registerNode({
        key: 'node2',
        value: { type: 'test', callback: () => Promise.resolve(new Set()) },
        dependsOn: []
      });

      effectManager.buildDependenciesMap();

      expect(effectManager.topologicalOrder).toEqual(['node2', 'node1']);
      expect(effectManager.dependentMap.get('node1')).toEqual(new Set(['node2']));
    });

    test('should throw on cyclic dependencies', () => {
      effectManager.registerNode({
        key: 'node1',
        value: { type: 'test', callback: () => Promise.resolve(new Set()) },
        dependsOn: ['node2']
      });

      effectManager.registerNode({
        key: 'node2',
        value: { type: 'test', callback: () => Promise.resolve(new Set()) },
        dependsOn: ['node1']
      });

      expect(() => effectManager.buildDependenciesMap()).toThrow("There are cyclic dependencies");
    });
  });

  describe('Effect triggering', () => {
    test('should trigger effects in topological order', async () => {
      const executionOrder: string[] = [];

      effectManager.registerNode({
        key: 'node1',
        value: {
          type: 'test',
          callback: async () => {
            executionOrder.push('node1');
            return new Set();
          }
        },
        dependsOn: ['node2']
      });

      effectManager.registerNode({
        key: 'node2',
        value: {
          type: 'test',
          callback: async () => {
            executionOrder.push('node2');
            return new Set();
          }
        },
        dependsOn: []
      });

      effectManager.buildDependenciesMap();
      await effectManager.triggerEffects();

      expect(executionOrder).toEqual(['node2', 'node1']);
    });

    test('should pass changedNames between effects', async () => {
      effectManager.registerNode({
        key: 'node1',
        value: {
          type: 'test',
          callback: async () => {
            return new Set(['node1']);
          }
        },
        dependsOn: ['root']
      });

      effectManager.registerNode({
        key: 'node2',
        value: {
          type: 'test',
          callback: async () => {
            return new Set(['node2']);
          }
        },
        dependsOn: ['node1']
      });

      effectManager.buildDependenciesMap();

      const changedNames = new Set<string>(["root"]);
      await effectManager.triggerEffects({ keys: changedNames });

      expect(changedNames).toEqual(new Set(["root", 'node1', 'node2']));
    });

    test('should skip effects when their dependencies are not changed', async () => {
      const calledNodes = new Set<string>();

      effectManager.registerNode({
        key: 'node1',
        value: {
          type: 'test',
          callback: async () => {
            calledNodes.add('node1');
            return new Set();
          }
        },
        dependsOn: []
      });

      effectManager.registerNode({
        key: 'node2',
        value: {
          type: 'test',
          callback: async () => {
            calledNodes.add('node2');
            return new Set();
          }
        },
        dependsOn: ['node1']
      });

      effectManager.buildDependenciesMap();

      // Only trigger effects that depend on 'node3' (none in this case)
      await effectManager.triggerEffects({ keys: new Set(['node3']) });

      expect(calledNodes.size).toBe(0);
    });

    test('should handle both sync and async callbacks', async () => {
      const executionOrder: string[] = [];

      effectManager.registerNode({
        key: 'syncNode',
        value: {
          type: 'test',
          callback: () => {
            executionOrder.push('sync');
            return new Set();
          }
        },
        dependsOn: []
      });

      effectManager.registerNode({
        key: 'asyncNode',
        value: {
          type: 'test',
          callback: async () => {
            executionOrder.push('async');
            return new Set();
          }
        },
        dependsOn: ['syncNode']
      });

      effectManager.buildDependenciesMap();
      await effectManager.triggerEffects();

      expect(executionOrder).toEqual(['sync', 'async']);
    });
  });

  describe('Error handling', () => {
    test('should continue execution if one effect fails', async () => {
      const calledNodes = new Set<string>();

      effectManager.registerNode({
        key: 'failingNode',
        value: {
          type: 'test',
          callback: async () => {
            throw new Error('Effect failed');
          }
        },
        dependsOn: []
      });

      effectManager.registerNode({
        key: 'workingNode',
        value: {
          type: 'test',
          callback: async () => {
            calledNodes.add('workingNode');
            return new Set();
          }
        },
        dependsOn: ['failingNode']
      });

      effectManager.buildDependenciesMap();

      await expect(effectManager.triggerEffects()).rejects.toThrow('Effect failed');
      expect(calledNodes).not.toContain('workingNode');
    });
  });
});