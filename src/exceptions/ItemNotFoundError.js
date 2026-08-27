export default class ItemNotFoundError extends Error {
    constructor(message) {
        super(message);

        this.name = "ItemNotFoundError";
    }
}
