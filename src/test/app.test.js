import { describe, it, expect, beforeEach } from 'vitest';

// Import all your models
import FoodItem from "../model/FoodItem";
import Cart from "../model/Cart";
import CartItem from "../model/CartItem";
import Menu from "../model/Menu";
import Category from "../model/Category";
import DuplicateItemError from "../exceptions/DuplicateItemError";

describe("Domain Models Test Suite", () => {

  // --- FoodItem Tests ---
  describe("FoodItem Model", () => {
    it("should create a valid food item successfully", () => {
      const burger = new FoodItem("Burger", 12.99, "burger.png"); //[cite: 3]
      expect(burger.name).toBe("Burger"); //[cite: 3]
      expect(burger.price).toBe(12.99); //[cite: 3]
      expect(burger.image).toBe("burger.png"); //[cite: 3]
      expect(burger.availability).toBe(true); //[cite: 3]
    });

    it("should throw an error if the price is invalid", () => {
      expect(() => {
        new FoodItem("Free Food", 0, "free.png"); //[cite: 3]
      }).toThrow("Price has to be larger than 0"); //[cite: 3]
    });

    it("should change fooditem availability successfully", () => {
      const pizza = new FoodItem("Pizza", 12, "pizza.png");
      pizza.changeAvailability(false);
      expect(pizza.availability).toBe(false);
    })
  });

  // --- Cart & CartItem Tests ---
  describe("Cart Model", () => {
    let cart;
    let testFood;
    let testCartItem;

    beforeEach(() => {
      cart = new Cart(); //[cite: 7]
      testFood = new FoodItem("Pizza", 15.00, "pizza.png"); //[cite: 3]
      testCartItem = new CartItem(testFood, 3, ["Extra Cheese"]); //[cite: 1]
    });

    it("should add a CartItem to the cart", () => {
      cart.addItem(testCartItem); //[cite: 7]
      
      expect(cart.items.length).toBe(1); //[cite: 7]
      expect(cart.items[0].name).toBe("Pizza"); //[cite: 7]
    });

    it("should decrease the quantity if removing less than the total", () => {
      cart.addItem(testCartItem); //[cite: 7]
      cart.removeItem(testCartItem, 2); //[cite: 7]
      
      expect(cart.items.length).toBe(1); //[cite: 7]
      expect(cart.items[0].quantity).toBe(2); //[cite: 7]
    });

    it("should remove the item completely if removing the total quantity", () => {
      cart.addItem(testCartItem); //[cite: 7]
      cart.removeItem(testCartItem, 0); //[cite: 7]
      
      expect(cart.items.length).toBe(0); //[cite: 7]
    });
  });

  // --- Menu & Category Tests ---
  describe("Menu Model", () => {
    it("should throw a DuplicateItemError when adding an existing category", () => {
      const menu = new Menu(); //[cite: 4]
      const drinksCategory = new Category("Drinks"); //[cite: 2]
      
      menu.addCategory(drinksCategory); //[cite: 4]
      
      expect(() => {
        menu.addCategory(drinksCategory); //[cite: 4]
      }).toThrow(DuplicateItemError); //[cite: 4]
    });

    it("should sucessfully add a valid item", () => {
      const category = new Category("Food");
      expect(category.foodList.length).toBe(0);
      category.addItem(new FoodItem("Pho", 12, "pho.png"));
      expect(category.foodList.length).toBe(1);
    })          
  });

});