import { describe, it, expect } from 'vitest';
import MenuIndex from './MenuIndex';
import parseOrderLocally from './FastOrderParser';

const MENU = ["Pepperoni Pizza", "Garlic Bread", "Coke", "Cheeseburger", "French Fries"];
const index = new MenuIndex(MENU);

const parse = (text) => parseOrderLocally(text, index);

describe('FastOrderParser', () => {

    describe('utterances it should resolve without the model', () => {
        it('handles a bare quantity plus a plural item', () => {
            expect(parse("two cokes")).toEqual([
                { action: 'add', foodName: 'Coke', quantity: 2 }
            ]);
        });

        it('handles a conversational add with filler words', () => {
            expect(parse("I'll have a pepperoni pizza please")).toEqual([
                { action: 'add', foodName: 'Pepperoni Pizza', quantity: 1 }
            ]);
        });

        it('resolves a partial name when only one menu item matches', () => {
            expect(parse("add 3 fries")).toEqual([
                { action: 'add', foodName: 'French Fries', quantity: 3 }
            ]);
        });

        it('handles multiple clauses with different actions', () => {
            expect(parse("drop the bread please, and add 2 pizza, thank you")).toEqual([
                { action: 'remove', foodName: 'Garlic Bread', quantity: 1 },
                { action: 'add', foodName: 'Pepperoni Pizza', quantity: 2 }
            ]);
        });

        it('handles digits and number words alike', () => {
            expect(parse("4 cheeseburgers")).toEqual([
                { action: 'add', foodName: 'Cheeseburger', quantity: 4 }
            ]);
            expect(parse("a couple of cheeseburgers")).toEqual([
                { action: 'add', foodName: 'Cheeseburger', quantity: 2 }
            ]);
        });

        it('carries the action across clauses', () => {
            expect(parse("remove the coke and the fries")).toEqual([
                { action: 'remove', foodName: 'Coke', quantity: 1 },
                { action: 'remove', foodName: 'French Fries', quantity: 1 }
            ]);
        });
    });

    describe('utterances it must defer to the model', () => {
        const deferred = [
            ["an unknown item", "can I get some sushi"],
            ["a modification", "a cheeseburger without onions"],
            ["a question", "what do you recommend?"],
            ["a dietary constraint", "do you have anything gluten free"],
            ["a substitution", "a coke instead of the fries"],
            ["a price query", "how much is the pizza"],
            ["a quantity with no item", "make it two"],
            ["empty input", "   "],
        ];

        it.each(deferred)('defers on %s', (_label, utterance) => {
            expect(parse(utterance)).toBeNull();
        });

        it('defers when a partial name is ambiguous', () => {
            const ambiguous = new MenuIndex(["Pepperoni Pizza", "Hawaiian Pizza"]);
            expect(parseOrderLocally("a pizza", ambiguous)).toBeNull();
            // ...but still resolves the unambiguous full name.
            expect(parseOrderLocally("a hawaiian pizza", ambiguous)).toEqual([
                { action: 'add', foodName: 'Hawaiian Pizza', quantity: 1 }
            ]);
        });

        it('defers on the whole utterance if any clause is unresolvable', () => {
            expect(parse("two cokes and some sushi")).toBeNull();
        });

        it('rejects non-string input', () => {
            expect(parse(null)).toBeNull();
            expect(parse(undefined)).toBeNull();
        });
    });

    describe('MenuIndex', () => {
        it('builds the prompt block in the format the model expects', () => {
            expect(index.promptBlock).toContain('-Pepperoni Pizza');
            expect(index.promptBlock).toContain('-Coke');
        });

        it('normalizes plurals only for longer words', () => {
            expect(MenuIndex.normalize("Cokes!")).toBe('coke');
            // "fries" must not become "frie"... it is >3 chars so it does;
            // the index stores the normalized menu name the same way.
            expect(index.resolve('fries')).toBe('French Fries');
        });
    });
});
