create table if not exists Category (
    id serial primary key,
    name varchar(255) not null unique
);

create table if not exists FoodItem (
    id serial primary key,
    name varchar(255) not null,
    category_id integer not null,
    foreign key (category_id) references Category(id) on delete cascade,
    constraint unqiue_name_per_category unique (name, category_id)
);