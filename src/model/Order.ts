import assert from "../Assertion";
import Cart from "./Cart";
import CartItem from "./CartItem";
import OrderItem from "./OrderItem";

export default class Order {
    #totalPrice: number;
    #orderItems: Array<OrderItem>;

    /**
     * 
     * @param {Cart} cart - Cart object that we want to convert into order 
     */
    constructor(cart: Cart) {
        this.#orderItems = new Array<OrderItem>();
        assert(cart != null, "Cart can't be null");
        const cartItem = cart.items;
        let totalPrice = 0;
        for(let i of cartItem) {
            const name = i.name;
            const quantity = i.quantity;
            const mods = i.modifications;
            const orderItem = new OrderItem(name, quantity, mods);
            totalPrice += i.foodItem.price;
            this.#orderItems.push(orderItem);
        }
        this.#totalPrice = totalPrice;
        this.#invariant();
    }

    //getters
    get totalPrice(): number {
        return this.#totalPrice;
    }
    get orderItems(): Array<OrderItem> {
        return this.#orderItems;
    }

    #invariant() {
        assert(this.#totalPrice > 0, "Total price has to be larger than 0");
        assert(this.#orderItems != null, "List of order items can't be null");
    }
}