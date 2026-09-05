/** @typedef {import('./MenuIndex').default} MenuIndex */

const NUMBER_WORDS = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    couple: 2, few: 3, dozen: 12
};

const REMOVE_VERBS = new Set(['remove', 'delete', 'cancel', 'drop', 'scrap', 'lose', 'nix']);
const UPDATE_VERBS = new Set(['change', 'update', 'set', 'switch']);
const ADD_VERBS = new Set(['add', 'get', 'want', 'like', 'have', 'grab', 'order', 'take', 'gimme', 'give']);

// Words that carry no ordering meaning and should not block a match.
const FILLER = new Set([
    'please', 'thanks', 'thank', 'you', 'ill', 'i', 'll', 'me', 'my', 'the',
    'some', 'just', 'also', 'can', 'could', 'would', 'to', 'of', 'for', 'on',
    'it', 'that', 'and', 'with', 'do', 'is', 'am', 'be', 'more', 'another',
    'lets', 'let', 'us', 'we', 'hi', 'hey', 'hello', 'yeah', 'yes', 'ok', 'okay'
]);

// Anything here needs real comprehension - hand the whole utterance to the model.
const BAIL_PATTERNS = /\b(without|instead|except|but|if|not|no\s|allerg|gluten|vegan|substitut|extra|side|what|which|how|why|when|where|who|recommend|special|price|cost|cheap|menu|options?)\b|\?/;

// A clause that carries no ordering information at all ("thank you") is
// ignored rather than treated as a parse failure.
const SKIP = Symbol('skip');

/**
 * Deterministic client-side parser for the common case.
 *
 * Most drive-through style utterances ("two cokes and a pepperoni pizza") are
 * fully mechanical. Resolving those locally costs microseconds instead of a
 * network round trip. Anything even slightly ambiguous returns null so the
 * caller falls back to the model - a wrong cart is worse than a slow one.
 *
 * @param {string} userInput
 * @param {MenuIndex} menuIndex
 * @returns {Array<{action: string, foodName: string, quantity: number}>|null}
 */
export default function parseOrderLocally(userInput, menuIndex) {
    if (typeof userInput !== 'string') return null;

    const lowered = userInput.toLowerCase();
    if (!lowered.trim()) return null;
    if (BAIL_PATTERNS.test(lowered)) return null;

    // Split on connectors so "drop the bread and add two pizzas" becomes two clauses.
    const clauses = lowered
        .split(/,|\band\b|\bplus\b|\balso\b|\bthen\b/)
        .map(clause => clause.trim())
        .filter(Boolean);

    if (clauses.length === 0) return null;

    const results = [];
    let carriedAction = null;

    for (const clause of clauses) {
        const parsed = parseClause(clause, menuIndex, carriedAction);
        if (parsed === SKIP) continue;
        // A clause we cannot fully account for invalidates the whole utterance.
        if (!parsed) return null;
        carriedAction = parsed.action;
        results.push(parsed);
    }

    return results.length > 0 ? results : null;
}

/**
 * @param {string} clause
 * @param {MenuIndex} menuIndex
 * @param {string|null} carriedAction - action from the previous clause
 * @returns {{action: string, foodName: string, quantity: number}|null}
 */
function parseClause(clause, menuIndex, carriedAction) {
    const rawWords = clause.replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return null;

    let action = null;
    let quantity = null;
    const itemWords = [];

    for (const word of rawWords) {
        if (REMOVE_VERBS.has(word)) { action = 'remove'; continue; }
        if (UPDATE_VERBS.has(word)) { action = 'update'; continue; }
        if (ADD_VERBS.has(word)) { if (!action) action = 'add'; continue; }

        if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, word)) {
            quantity = NUMBER_WORDS[word];
            continue;
        }
        if (/^\d+$/.test(word)) {
            quantity = parseInt(word, 10);
            continue;
        }

        if (FILLER.has(word)) continue;

        itemWords.push(word);
    }

    if (itemWords.length === 0) {
        // Pure pleasantry - ignore it. But "make it two" names a quantity with
        // no item, which needs conversational context we do not have here.
        return (quantity === null && action === null) ? SKIP : null;
    }

    const foodName = menuIndex.resolve(itemWords.join(' '));
    if (!foodName) return null;

    // "make it three burgers" style clauses set an explicit count; a bare
    // "burger" with no verb is an add of one.
    const resolvedAction = action ?? carriedAction ?? 'add';

    return {
        action: resolvedAction,
        foodName,
        quantity: quantity ?? 1
    };
}
