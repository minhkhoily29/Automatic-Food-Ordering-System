import { PGlite } from "@electric-sql/PGlite";
import ddl from '../../tables.sql?raw';

let src = import.meta.env.VITE_DATABASE_URL;

const pgliteDb = await PGlite.create(src);

db().exec(ddl);

export default function db() {
    return pgliteDb;
}