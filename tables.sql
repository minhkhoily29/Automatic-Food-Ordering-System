create table if not exists category (
    name varchar(255) not null unique
);

create table if not exists fooditems (
    name varchar(255) unique not null,
    price integer not null,
    image varchar(255) unique not null,
    category varchar(255) unique not null,
    foreign key (category) references category(id) on delete cascade
);

insert into category (name) values
    ('Sides'),
    ('Burger'),
    ('Pizza'),
    ('Dessert'),
    ('Drinks')
on conflict do nothing;

insert into fooditems (name, price, image, category) values
    ('Fries', 1, 'fries.jpg', 'Side'),
    ('Onion Rings', 1, 'Onion.jpg', 'Side'),
    ('Beef Burger', 5, 'beef.jpg', 'Burger'),
    ('Fish Burger', 5, 'fish.jpg', 'Burger'),
    ('Peperoni Pizza', 10, 'peperoni.jpg', 'Pizza'),
    ('Cheese Pizza', 10, 'cheese.jpg', 'Pizza'),
    ('Mochi', 2, 'mochi.jpg', 'Dessert'),
    ('Cheese Cake', 2, 'cake.jpg', 'Dessert'),
    ('Boba tea', 2.5, 'boba.jpg', "Drinks"),
    ('Cappucino', 2.5, 'coffee.jpg', "Drinks"),
on conflict do nothing;