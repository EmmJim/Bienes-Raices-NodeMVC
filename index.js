import express from "express";
import csrf from 'csurf';
import cookieParser from "cookie-parser";
import usuarioRoutes from './routes/usuarioRoutes.js';
import propiedadesRoutes from './routes/propiedadesRoutes.js';
import appRoutes from './routes/appRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import db from './config/db.js';

const app = express();

//Habilitar cookie parser
app.use(cookieParser());

//Habilitar CSRF
let csrfProtection = csrf({cookie: true});

//Conexion a la BD
try {
    await db.authenticate();
    db.sync();
    console.log('Conexion correcta a la BD');
} catch (error) {
    console.log('error');
}

//Habilitar pug
app.set('view engine', 'pug');
app.set('views', './views');

app.use(express.json());
app.use(express.urlencoded({extended: true}));

//Carpeta publica
app.use(express.static('public'));

app.use('/', csrfProtection, appRoutes);
app.use('/auth', csrfProtection, usuarioRoutes);
app.use('/', csrfProtection, propiedadesRoutes);
app.use('/api', apiRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`El servidor esta funcionando en el puerto ${port}`);
})