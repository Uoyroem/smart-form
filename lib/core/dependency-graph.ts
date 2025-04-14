export class DependencyGraph<Key = string> {
    private _keys: Set<Key>;
    private _dependentMap: Map<Key, Set<Key>>;
    private _dependencyMap: Map<Key, Set<Key>>;
    private _topologicalOrder: Key[];
    protected _addedDependencies: [Key, Key][];

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

    clone(): DependencyGraph<Key> {
        const graph = new DependencyGraph<Key>();
        graph._addedDependencies = this._addedDependencies.slice();
        return graph;
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

export interface Node<Key, Value> {
    readonly key: Key;
    readonly value: Value;
    readonly dependsOn: readonly Key[];
}

export class ValuedDependencyGraph<Value, Key = string> extends DependencyGraph<Key> {
    private _nodes: Map<Key, Node<Key, Value>>;

    constructor() {
        super();
        this._nodes = new Map();
    }

    override getDependencies(): readonly [Key, Key][] {
        const dependencies: [Key, Key][] = [];
        for (const [key, valueKey] of this._nodes.entries()) {
            for (const dependency of valueKey.dependsOn) {
                dependencies.push([key, dependency]);
            }
        }
        return super.getDependencies().concat(dependencies);
    }

    clone(): ValuedDependencyGraph<Value, Key> {
        const graph = new ValuedDependencyGraph<Value, Key>();
        graph._addedDependencies = [...this._addedDependencies];
        graph._nodes = new Map(this._nodes);
        return graph;
    }

    registerNode(node: Node<Key, Value>) {
        this._nodes.set(node.key, node);
    }

    getNode(key: Key): Node<Key, Value> | undefined {
        return this._nodes.get(key);
    }
}