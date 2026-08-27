import Listener from "../model/Listener";

export default class CartView {
    #controller;
    #cart;
    #cartItems;
    #htmlEl;

    /**
     * 
     * @param {Cart} cart - Cart object that we want to render 
     * @param {array} cartItems - Array of all the items inside cart 
     * @param {controller} controller - The controller 
     */
    constructor(cart, cartItems, controller) {
        this.#controller = controller;
        this.#cart = cart;
        this.#cartItems = cartItems;

        this.#cart.registerListener(this);
        this.#htmlEl = document.querySelector<HTMLDivElement>("#root"); //change this later
        this.notify();
    }

    notify() {
        this.#htmlEl.replaceChildren();
        //fill this in later
    }
}