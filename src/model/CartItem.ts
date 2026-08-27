import assert from "../Assertion";
import FoodItem from "./FoodItem";

export default class CartItem {
    #name: string;
    #quantity: number;
    #modifications: Array<string>;
    #foodItem: FoodItem;

    /**
     * 
     * @param {FoodItem} foodItem - FoodItem object that we want to convert into a cart item 
     * @param {number} quantity - How many of that foodItem we want to convert 
     * @param {Array} modifications - Array of strings of the order modifications 
     */
    constructor(foodItem: FoodItem, quantity: number, modifications: Array<string>) {
        assert(foodItem instanceof FoodItem, "foodItem has to be an object");
        assert(quantity > 0, "Quantity has to be larger than 0");
        assert(Array.isArray(modifications), "Modifications has to be an array");
        this.#name = foodItem.name;
        this.#quantity = quantity;
        this.#foodItem = foodItem;
        this.#modifications = modifications;
        this.#invariant();
    }

    //getters
    get name(): string {
        return this.#name;
    }
    get quantity(): number {
        return this.#quantity;
    }
    get modifications(): Array<string> {
        return this.#modifications;
    }
    get foodItem(): FoodItem {
        return this.#foodItem;
    }

    /**
     * 
     * @param {number} newQuantity - The quantity that we want to change into 
     */
    changeQuantity(newQuantity: number) {
        assert(newQuantity > 0, "Updated quantity can't be less or equal to 0");
        this.#quantity = newQuantity;
        this.#invariant();
    }

    #invariant() {
        assert(this.#name != null, "There's no foodItem");
        assert(this.#quantity > 0, "Quantity has to be larger than 0");
        assert(this.#modifications != null, "Modification can't be null");
        Array.from(this.#modifications).forEach(m => {
            assert(m != null, "There can't be an empty modification");
        });
    }
}