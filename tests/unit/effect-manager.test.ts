// EffectManager.test.ts
import * as Uoyroem from "../../lib/index";


describe('EffectManager', () => {
  let effectManager: Uoyroem.EffectManager;

  beforeEach(() => {
    effectManager = new Uoyroem.EffectManager();
  });

  it('should add effect and build dependencies', () => {
    effectManager.registerNode({
      key: "effect1",
      value: {
        type: "test",
        callback: () => Promise.resolve(new Set()),
      },
      dependsOn: ["dep1", "dep2"]
    });

    effectManager.buildDependenciesMap();

    expect(effectManager["_dependentMap"].get("effect1")).toEqual(new Set(["dep1", "dep2"]));
  });

  it('should detect cyclic dependencies', () => {
    effectManager.registerNode({
      key: "effect1",
      value: {

        type: "test",
        callback: () => Promise.resolve(new Set()),
      },
      dependsOn: ["effect2"]
    });

    effectManager.registerNode({
      key: "effect2",
      value: {

        type: "test",
        callback: () => Promise.resolve(new Set()),
      },
      dependsOn: ["effect1"]
    });

    expect(() => effectManager.buildDependenciesMap()).toThrow("There are cyclic dependencies");
  });

  it('should trigger effects in topological order', async () => {
    const calls: string[] = [];

    effectManager.registerNode({
      key: "effect1",
      value: {
        type: "test",
        callback: () => {
          calls.push("effect1");
          return Promise.resolve(new Set());
        },
      },
      dependsOn: ["effect2"]
    });

    effectManager.registerNode({
      key: "effect2",
      value: {
        type: "test",
        callback: () => {
          calls.push("effect2");
          return Promise.resolve(new Set());
        },
      },
      dependsOn: []
    });

    effectManager.buildDependenciesMap();
    await effectManager.triggerEffects();

    expect(calls).toEqual(["effect2", "effect1"]);
  });
});