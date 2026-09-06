import { useState, useEffect } from 'react';

export default function CartView(cart, controller) {
    const [cartItems, setCartItems] = useState([]);

    useEffect(() => {
        const onCartUpdate = () => {
            setCartItems([cart.items()]);
        };

        onCartUpdate();

        cart.registerListener(onCartUpdate);

        return () => {
            cart.unregisterListener(onCartUpdate);
        }
    }, [cart]);

    return (
        <div className="cart-container">
            <h2>Your Cart</h2>
            
            {cartItems.length === 0 ? (
                <p>Your cart is empty.</p>
            ) : (
                <ul>
                    {cartItems.map((item, index) => (
                        <li key={item.id || index} style={{ marginBottom: "10px" }}>
                            <span>
                                {item.quantity}x {item.name}
                            </span>
                            <button 
                                onClick={() => controller.removeItemFromCart(item)}
                                style={{ marginLeft: "10px" }}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}