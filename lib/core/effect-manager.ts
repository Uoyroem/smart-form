import { ValuedDependencyGraph } from "./dependency-graph";

export interface Effect {
    type: string;
    callback: () => Promise<Set<string>> | Set<string>;
}

export class EffectManager extends ValuedDependencyGraph<Effect> {
    async triggerEffects({ changedNames = null }: { changedNames?: Set<string> | null } = {}) {
        for (const name of this.topologicalOrder) {
            if (changedNames != null && this.dependentMap.get(name)!.intersection(changedNames).size === 0) {
                continue;
            }
            const node = this.getNode(name);
            if (node != null) {
                const changedNamesByEffect = await node.value.callback();
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