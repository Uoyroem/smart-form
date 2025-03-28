import { Uoyroem } from "../../lib/core/form";

describe("Uoyroem.EffectManager", () => {
    let manager: Uoyroem.EffectManager;

    beforeEach(() => {
        manager = new Uoyroem.EffectManager();
    });

    test("should build dependency graph", () => {
        manager.addEffect("effect1", {
            type: "test",
            callback: () => new Set(),
            dependsOn: ["field1"],
        });

        manager.buildDependenciesMap();
        expect(manager["_topologicalOrder"]).toEqual(
            expect.arrayContaining(["field1", "effect1"])
        );
    });

    it("should detect circular dependencies", () => {
        manager.addEffect("effect1", {
            type: "test",
            callback: () => new Set(),
            dependsOn: ["effect2"],
        });

        manager.addEffect("effect2", {
            type: "test",
            callback: () => new Set(),
            dependsOn: ["effect1"],
        });

        expect(() => manager.buildDependenciesMap()).toThrow("cyclic");
    });
});
