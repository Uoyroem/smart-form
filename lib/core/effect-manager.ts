import { DependencyGraph } from "./dependency-graph";

export interface Effect {
    type: string;
    callback: () => Promise<Set<string>> | Set<string>;
    dependsOn: string[];
}

export class EffectManager extends DependencyGraph {
    private _keyEffect: Map<string, Effect> = new Map();

    constructor() {
        super();
        this._keyEffect = new Map();
    }

    override getDependencies(): readonly [string, string][] {
        const dependencies: [string, string][] = [];
        for (const [key, effect] of this._keyEffect) {
            for (const dependency of effect.dependsOn) {
                dependencies.push([key, dependency])
            }
        }
        return super.getDependencies().concat(dependencies);
    }

    addEffect(key: string, effect: Effect) {
        this._keyEffect.set(key, effect)
    }

    async triggerEffects({ changedNames = null }: { changedNames?: Set<string> | null } = {}) {
        for (const name of this.topologicalOrder) {
            if (changedNames != null && this.dependentMap.get(name)!.intersection(changedNames).size === 0) {
                continue;
            }
            const effect = this._keyEffect.get(name);
            if (effect != null) {
                const changedNamesByEffect = await effect.callback();
                if (changedNames) {
                    changedNamesByEffect.forEach(changedName => { changedNames.add(changedName); });
                }
            } else {
                if (changedNames) {
                    changedNames.add(name);
                }
            }
        }
    }
}