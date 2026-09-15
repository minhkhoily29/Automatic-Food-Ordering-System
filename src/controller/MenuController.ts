import Cart from "../model/Cart";
import CartItem from "../model/CartItem";
import Category from "../model/Category";
import ChatState from "../model/ChatState";
import FoodItem from "../model/FoodItem";
import Menu from "../model/Menu";
import AIService from "../services/AIService";


export default class MenuController {
    #menu!: Menu;
    #cart!: Cart;
    #chat!: ChatState;
    #categories!: Array<Category>;
    #onCartUpdate!: (items: Array<CartItem>) => void;
    #aiService!: AIService;



    constructor() {
    }

    async loadingMenu() {
        this.#categories = await Category.getCategories();
        this.#menu = new Menu();
        for(let c of this.#categories) {
            let foods = await FoodItem.getFoodItems(c);
            foods.forEach((f) => c.addItem(f));
            this.#menu.addCategory(c);
        }
    }

    removeItemFromCart(item: CartItem) {
        this.#cart.removeItem(item, 1);

        const updatedItems = this.#cart.items;
    }

    startListening() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; 
        if(!SpeechRecognition) {
            alert("Speech Recognition is not supported in this browser. Please use Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log("Mic is hot");
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log(`Transcrived voice: "${transcript}"`);

            let success = await this.#processVoiceOrder(transcript);
            if(!success) {
                //throw a message in front end
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Mic error", event.error);
        };

        recognition.start();

    }

    async #processVoiceOrder(transcript: string): Promise<boolean>{
        let validItems = new Array<String>();
        for(let c of this.#categories) {
            c.foodList.forEach((f) => validItems.push(f.name));
        }

        const intents = await this.#aiService.extractOrder(transcript, validItems);

        let cartChanged = false;

        for(const intent of intents) {
            if(intent.action === "add") {
                const foodItem = this.#menu.find(intent.foodName);

                if(typeof foodItem === "undefined") continue;

                const cartItem = new CartItem(foodItem, intent.quantity);
                this.#cart.addItem(cartItem);
                cartChanged = true;
            }
            else if(intent.action === "remove") {
                const foodItem = this.#menu.find(intent.foodName);

                if(typeof foodItem === "undefined") continue;

                const cartItem = new CartItem(foodItem, intent.quantity);
                this.#cart.removeItem(cartItem, intent.quantity);
                cartChanged = true;
            }
        }
        return cartChanged;

    }



}