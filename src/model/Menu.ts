import assert from "../Assertion";
import DuplicateItemError from "../exceptions/DuplicateItemError";
import Category from "./Category";
import FoodItem from "./FoodItem";
import Listener from "./Listener";

export default class Menu {
    #categories: Array<Category>;
    #listeners: Array<Listener>;

    constructor() {
        this.#categories = new Array<Category>();
        this.#listeners = new Array<Listener>();
        this.#invariant();
    }

    //getters
    get categories(): Array<Category> {
        return this.#categories;
    }

    /**
     * 
     * @param {Category} category - Category object that we want to add into current menu 
     */
    addCategory(category: Category) {
        assert(category != null, "Category can't be null");
        for(let c of this.#categories) {
            if(c.name == category.name) {
                throw new DuplicateItemError("This category already exist in current menu");
            }
        }
        this.#categories.push(category);
        this.#invariant();
        this.#notifyAll();
    }

    find(foodName: string): FoodItem | undefined{
        let item: FoodItem | undefined;
        for(let c of this.#categories) {
            item = c.foodList.find(f => f.name == foodName);
            if(typeof item == "undefined") {
                return item;
            }
        }
        return item;
    }

    registerListener(listener: Listener) {
        this.#listeners.push(listener);
    }

    unregisterListener(listener: Listener) {
        this.#listeners = this.#listeners.filter(l => l !== listener);
    }
    
    #notifyAll() {
        this.#listeners.forEach((l) => l.notify());
    }

    #invariant() {
        assert(this.#categories !== null, "List of categories can't be null");
        assert(this.#listeners !== null, "Listener can't be null");
    }
}