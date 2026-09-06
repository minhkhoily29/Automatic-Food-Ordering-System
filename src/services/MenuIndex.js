/**
 * Precomputed lookup structures for a menu.
 *
 * Built once per distinct menu and reused across every AI call. This keeps the
 * prompt prefix byte-for-byte identical between requests (which is what the
 * provider's implicit context caching keys on) and gives the local fast-path
 * parser an O(1) item lookup instead of a scan.
 */
export default class MenuIndex {
    #items;
    #promptBlock;
    #byExact;
    #byWord;

    /**
     *
     * @param {Array<string>} validMenuItems
     */
    constructor(validMenuItems) {
        this.#items = Object.freeze([...validMenuItems]);
        this.#promptBlock = this.#items.map(item => `-${item}`).join('\n');

        this.#byExact = new Map();
        // word -> Set of canonical names containing that word. Used to resolve
        // partial phrases ("pizza") only when they land on exactly one item.
        this.#byWord = new Map();

        for (const item of this.#items) {
            const normalized = MenuIndex.normalize(item);
            this.#byExact.set(normalized, item);

            for (const word of normalized.split(' ')) {
                if (!word) continue;
                let bucket = this.#byWord.get(word);
                if (!bucket) {
                    bucket = new Set();
                    this.#byWord.set(word, bucket);
                }
                bucket.add(item);
            }
        }
    }

    get items() {
        return this.#items;
    }

    /** The `-Item` block injected into the system instruction. */
    get promptBlock() {
        return this.#promptBlock;
    }

    /**
     * Lowercase, strip punctuation, collapse whitespace and drop plural "s"
     * so "Cokes!" and "coke" both land on the same key.
     *
     * @param {string} text
     * @returns {string}
     */
    static normalize(text) {
        return String(text)
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .trim()
            .split(/\s+/)
            .map(word => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word))
            .join(' ');
    }

    /**
     * Resolve a spoken phrase to a canonical menu name.
     *
     * Returns null unless the phrase is unambiguous - a near-miss guess would
     * put the wrong food in someone's cart, which is far worse than the extra
     * round trip of falling back to the model.
     *
     * @param {string} phrase
     * @returns {string|null}
     */
    resolve(phrase) {
        const normalized = MenuIndex.normalize(phrase);
        if (!normalized) return null;

        const exact = this.#byExact.get(normalized);
        if (exact) return exact;

        // Every word in the phrase must be a menu word, and the intersection of
        // their buckets must contain exactly one item.
        const words = normalized.split(' ');
        let candidates = null;
        for (const word of words) {
            const bucket = this.#byWord.get(word);
            if (!bucket) return null;
            candidates = candidates === null
                ? new Set(bucket)
                : new Set([...candidates].filter(item => bucket.has(item)));
            if (candidates.size === 0) return null;
        }
        return candidates && candidates.size === 1 ? [...candidates][0] : null;
    }
}
