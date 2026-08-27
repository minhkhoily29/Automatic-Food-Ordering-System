export default class DuplicateItemError extends Error {
    constructor(message) {
        super(message);

        this.name = "DuplicateItemError";
    }
}
