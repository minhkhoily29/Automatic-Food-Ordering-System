import assert from "../Assertion";
import DuplicateItemError from "../exceptions/DuplicateItemError";
import FoodItem from "./FoodItem";
import Listener from "./Listener";
import db from "./Connection";

export default class Category {
    #name: string;
    #id: number;
    #foodList: Array<FoodItem>;
    #listeners: Array<Listener>;

    /**
     * 
     * @param {string} name - name for the category 
     */
    constructor(name: string, id: number) {
        assert(name != null, "Name can't be null");
        assert(name.length > 0, "Name can't  be empty");
        this.#name = name;
        this.#id = id;
        this.#foodList = new Array<FoodItem>();
        this.#listeners = new Array<Listener>();
        this.#invariant();
    }
    
    //getters
    get name(): string {
        return this.#name;
    }
    get foodList(): Array<FoodItem> {
        return this.#foodList;
    }
    get id(): number {
        return this.#id;
    }


    /**
     * 
     * @param {FoodItem} item - The fooditem that we want to add into this category 
     */
    addItem(item: FoodItem) {
        assert(item!= null, "Food Item can't be null");
        Array.from(this.#foodList).forEach((i) => {
            if(i.name == item.name) {
                throw new DuplicateItemError("This item has already been added");
            }
        })
        this.#foodList.push(item);
        this.#invariant();
        this.#notifyAll();
    }

    registerListener(listener: Listener) {
        this.#listeners.push(listener);
    }
    
    static async getCategories(): Promise<Array<Category>> {
        let result = await db().query<
        {
            id: number,
            name: string
        }
        >('select id, name from categories');
        let loadedCategories = new Array<Category>();
        for (let row of result.rows) {
            let category = new Category(row.name, row.id);
            loadedCategories.push(category);
        }
        return loadedCategories;
    }

    #notifyAll() {
        this.#listeners.forEach((l) => l.notify());
    }

    #invariant() {
        assert(this.#name != null, "Name can't be null");
        assert(this.#foodList != null, "Food list can't be null");
        assert(this.#name.length > 0, "Name can't be empty");
        assert(this.#listeners != null, "Listners can't be null");
    }
}