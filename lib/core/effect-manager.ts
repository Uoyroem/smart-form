import "core-js/actual/set/intersection";
import { ValuedDependencyGraph } from "./dependency-graph";

export interface Effect {
    type: string;
    callback: () => Promise<Set<string>> | Set<string>;
}

export class EffectManager extends ValuedDependencyGraph<Effect> {
    async triggerEffects({ keys = null }: { keys?: Set<string> | null, stopOnError?: boolean, errorAsChange?: boolean } = {}): Promise<void> {
        for (const key of this.topologicalOrder) {
            if (keys != null && this.dependentMap.get(key)!.intersection(keys).size === 0) {
                continue;
            }
            const node = this.getNode(key);
            if (node != null) {
                const keysByEffect = await node.value.callback();
                keys && keysByEffect.forEach(keys.add, keys);
            } else {
                keys?.add(key);
            }
        }
    }
}