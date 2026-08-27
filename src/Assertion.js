export default function assert(val, message) {
  if (!val){
    throw new AssertionError(message);
  }
}

class AssertionError extends Error{
    constructor(message){
        super(message);
    }
}