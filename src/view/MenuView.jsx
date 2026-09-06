import { useState, useEffect } from 'react';

export default function MenuView(menu, controller) {
    const [categories, setFoodItems] = useState([]);

    useEffect(() => {
        setFoodItems([menu.categories]);
    }, [menu]);

    return (
        <div className="menu-container">
            <h2>Restaurant Menu</h2>

            {categories.map((category, catIndex) => (
                <div key={category.id || catIndex} className="category-section">
                    <h3>{category.name}</h3>

                    <ul>
                        {category.items.map((item, itemIndex) => (
                            <li key={item.id || itemIndex}>
                                {item.name} - ${item.price}
                                <button onClick={() => controller.addItemToCart(item)}>
                                    Add
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}