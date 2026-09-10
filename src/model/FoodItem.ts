import assert from "../Assertion";
import Listener from "./Listener";
import db from "./Connection";
import Category from "./Category";

export default class FoodItem {
    #name: string;
    #price: number;
    #availability: boolean;
    #image: string;
    #listeners: Array<Listener>;
    #id: number;
    /**
     * 
     * @param {string} name - Name of the food
     * @param {number} price - Price of the food
     * @param {string} image - Name of the image of the food
     */
    constructor(id: number, name: string, price: number, image: string) {
        assert(name != null, "Name can't be null");
        assert(name.length > 0, "Name can't be empty");
        assert(image != null, "Image can't be null");
        assert(image.length > 0, "Image can't be empty");
        assert(price > 0, "Price has to be larger than 0");
        assert(id > 0, "id can't be less than 1");
        this.#id = id;
        this.#name = name;
        this.#price = price;
        this.#availability = true;
        this.#image = image;
        this.#listeners = new Array<Listener>();
        this.#invariant();
    } 

    //getters
    get name(): string {
        return this.#name;
    }
    get price(): number {
        return this.#price;
    }
    get availability(): boolean {
        return this.#availability;
    }
    get image(): string {
        return this.#image;
    }
    get id(): number {
        return this.#id;
    }

    /**
     * 
     * @param {boolean} newAvailability - Setting availablity of this food item
     */
    changeAvailability(newAvailability: boolean) {
        this.#availability = newAvailability;
        this.#invariant();
        this.#notifyAll();
    }

    registerListener(listener: Listener) {
        this.#listeners.push(listener);
    }
    
    static async getFoodItems(category: Category): Promise<Array<FoodItem>> {
        let result = await db().query<
        {
            id: number,
            name: string,
            price: number,
            image: string
        }
        >('select id, name, price, image from fooditems where category = $1', [category.name]);
        let loadedFoodItems = new Array<FoodItem>();
        for(let food of result.rows) {
            let f = new FoodItem(food.id, food.name, food.price, food.image);
            loadedFoodItems.push(f);
        }
        return loadedFoodItems;
    }

    #notifyAll() {
        this.#listeners.forEach((l) => l.notify());
    }

    #invariant() {
        assert(this.#name != null, "Name can't be null");
        assert(this.#name.length > 0, "Name has to be larger than 0");
        assert(this.#image != null, "Image can't be null");
        assert(this.#image.length > 0, "Image name can't be empty");
        assert(this.#availability != null, "Availability can't be null");
        assert(this.#price > 0, "Price has to be higher than 0");
        assert(this.#listeners != null, "Listener can't be null");
    }

}