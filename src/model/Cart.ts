import CartItem from "./CartItem.ts";
import assert from "../Assertion";
import Listener from "./Listener";
import ItemNotFoundError from "../exceptions/ItemNotFoundError";

export default class Cart {
    #items: Array<CartItem>;
    #listeners: Array<Listener>;

    constructor() {
        this.#items = new Array<CartItem>();
        this.#listeners = new Array<Listener>();
        this.#invariant();
    }

    //getters
    get items(): Array<CartItem> {
        return this.#items;
    }

    /**
     * Adding cart item into cart
     * 
     * @param {CartItem} item - FoodItem object that we want to add 
     */
    addItem(item: CartItem) {
        assert(item != null, "Item can't be null");
        this.#items.forEach(i => {
            if(item.name === i.name) {
                item.changeQuantity(item.quantity + 1);
                this.#invariant();
                return;
            }
        });
        this.#items.push(item);
        this.#invariant();
        this.#notifyAll();
    }
    
    /**
     * Removing chosen item from cart
     * 
     * @param {CartItem} item - CartItem that we want to remove
     * @param {number} quantity - The new quantity of current cart item after updated
     */
    removeItem(item: CartItem, quantity: number) {
        assert(item != null, "This item can't be null");
        assert(quantity >= 0, "Number can't be negative");
        
        if(quantity == 0) {
            this.#items = this.#items.filter(i => i.name !== item.name);
        } else {
            const foundItem = this.#items.find(i => i.name === item.name);
            if(foundItem) {
                foundItem.changeQuantity(quantity);
            } else {
                throw new ItemNotFoundError("Item you want to remove is not found");
            }
        }
        this.#invariant();
        this.#notifyAll();
    }

    registerListener(listener: Listener) {
        this.#listeners.push(listener);
    }

    #notifyAll() {
        Array.from(this.#listeners).forEach((l) => l.notify());
    }

    #invariant() {
        assert(this.#items != null, "list of items can't be null");
        assert(this.#listeners != null, "list of listener is null");
    }
}