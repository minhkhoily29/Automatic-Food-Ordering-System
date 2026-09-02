import assert from "../Assertion";

export default class OrderItem {
    #foodName: string;
    #quantity: number;

    /**
     * 
     * @param {string} foodName - Name of the food of the order item 
     * @param {number} quantity - Quantity of the food if the order item
     * @param {array} modification - All the modification of the order item
     */
    constructor(foodName: string, quantity: number) {
        assert(foodName != null, "Name of food can't be null");
        assert(quantity > 0, "Quantity of this item have to be larger than 0");
        this.#foodName = foodName;
        this.#quantity = quantity;
        this.#invariant;
    }

    //getters
    get foodName(): string {
        return this.#foodName;
    }
    get quantity(): number {
        return this.#quantity;
    }

    #invariant() {
        assert(this.#foodName !== null, "Food name can't be null");
        assert(this.#quantity > 0, "Quantity has to be largeer than 0");
    }
}