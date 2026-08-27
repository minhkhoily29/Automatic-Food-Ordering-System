import Listener from "../model/Listener";
import Category from "../model/Category";

export default class MenuView extends Listener {
    #controller;
    #menu;
    #categories;
    #divEl;
    #htmlEl;

    /**
     * 
     * @param {menu} menu - the menu object
     * @param {array} categories - Array of all the categories in the menu  
     * @param {controller} controller - the controller
     */
    constructor(menu, categories, controller) {
        this.#controller = controller;
        this.#menu = menu;
        this.#categories = categories;

        this.#menu.registerListener(this);
        this.#htmlEl = document.querySelector<HTMLDivElement>("#root"); //change this later
        this.notify();
    }

    notify() {
        this.#divEl.replaceChildren();
        //fill this in later
    }
}