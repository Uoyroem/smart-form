export class DependencyGraph<Key = string> {
    private _keys: Set<Key>;
    private _dependentMap: Map<Key, Set<Key>>;
    private _dependencyMap: Map<Key, Set<Key>>;
    private _addedDependencies: [Key, Key][];
    private _topologicalOrder: Key[];

    constructor() {
        this._keys = new Set<Key>();
        this._dependentMap = new Map();
        this._dependencyMap = new Map();
        this._addedDependencies = [];
        this._topologicalOrder = [];
    }

    getDependencies(): readonly [Key, Key][] {
        return this._addedDependencies;
    }

    buildDependenciesMap(): void {
        this._dependentMap = new Map();
        this._dependencyMap = new Map();
        this._keys = new Set();
        this._topologicalOrder = [];

        const dependencies = this.getDependencies();

        for (const [dependent, dependency] of dependencies) {
            this._keys.add(dependent);
            this._keys.add(dependency);
            if (!this._dependentMap.has(dependent)) {
                this._dependentMap.set(dependent, new Set());
            }
            if (!this._dependentMap.has(dependency)) {
                this._dependentMap.set(dependency, new Set());
            }
            if (!this._dependencyMap.has(dependent)) {
                this._dependencyMap.set(dependent, new Set());
            }
            if (!this._dependencyMap.has(dependency)) {
                this._dependencyMap.set(dependency, new Set());
            }
            this._dependentMap.get(dependent)!.add(dependency);
            this._dependencyMap.get(dependency)!.add(dependent);
        }
        const inDegree = new Map();
        for (const [dependent, dependencies] of this._dependentMap) {
            inDegree.set(dependent, dependencies.size);
        }
        const queue: Key[] = [];
        for (const [dependent, degree] of inDegree) {
            if (degree === 0) {
                queue.push(dependent);
            }
        }
        while (queue.length > 0) {
            const key = queue.shift()!;
            this._topologicalOrder.push(key);
            for (const dependency of this._dependencyMap.get(key)!) {
                inDegree.set(dependency, inDegree.get(dependency) - 1);
                if (inDegree.get(dependency) === 0) {
                    queue.push(dependency);
                }
            }
        }
        if (this._topologicalOrder.length !== this._keys.size) {
            throw new Error("There are cyclic dependencies");
        }
    }

    addDependency(dependent: Key, dependency: Key): void {
        this._addedDependencies.push([dependent, dependency]);
    }

    get keys(): ReadonlySet<Key> {
        return this._keys;
    }

    get topologicalOrder(): readonly Key[] {
        return this._topologicalOrder;
    }

    get dependentMap(): ReadonlyMap<Key, ReadonlySet<Key>> {
        return this._dependentMap;
    }

    get dependencyMap(): ReadonlyMap<Key, ReadonlySet<Key>> {
        return this._dependencyMap;
    }
}