import categorias from './categorias.js';
import precios from './precios.js';
import usuarios from './usuarios.js';
import db from '../config/db.js';
import {Categoria, Precio, Usuario} from '../models/index.js'

const importarDatos = async () => {
    try {
        //Autenticar en la BD
        await db.authenticate();
        //Generar las columnas 
        await db.sync();
        //Insertamos los datos
        await Promise.all([Categoria.bulkCreate(categorias), Precio.bulkCreate(precios), Usuario.bulkCreate(usuarios)]);
        console.log('Datos Importados Correctamente');
        process.exit(); //0 o nada finaliza el proceso sin error
    } catch (error) {
        console.log(error);
        process.exit(1); //Finaliza el proceso con error
    }
}

const eliminarDatos = async () => {
    try {
        await Promise.all([Categoria.destroy({where: {}, truncate: true}), Precio.destroy({where: {}, truncate: true})]);
        console.log('Datos Eliminados Correctamente');
        process.exit();
    } catch (error) {
        console.log(error);
        process.exit(1); //Finaliza el proceso con error
    }
}

if(process.argv[2] === "-i") {
    importarDatos();
}

if(process.argv[2] === "-e") {
    eliminarDatos();
}