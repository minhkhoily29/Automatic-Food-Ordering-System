import Listener from "./Listener";

export default class ChatState {
    #message: string;
    #listeners: Array<Listener>;

    constructor() {
        this.#message = "";
        this.#listeners = new Array<Listener>();
    }

    get message(): string {
        return this.#message;
    }

    appendChunk(chunk: string) {
        this.#message += chunk;
        this.#notifyAll();
    }

    clearMessage() {
        this.#message = "";
        this.#notifyAll();
    }

    registerListener(l: Listener) {
        this.#listeners.push(l);
    } 

    unregisterListener(listener: Listener) {
        this.#listeners = this.#listeners.filter(l => l !== listener);
    }

    #notifyAll() {
        this.#listeners.forEach(l => l.notify());
    }

}