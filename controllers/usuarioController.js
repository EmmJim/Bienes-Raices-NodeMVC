import {check, validationResult} from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import { generarJWT, generarId } from '../helpers/tokens.js';
import { emailRegistro, emailOlvidePassword } from '../helpers/emails.js';

const formularioLogin = (req, res) => {
    res.render('auth/login' , {
        pagina: 'Iniciar Sesión',
        csrfToken: req.csrfToken(), 
    });
}

const autenticar = async (req, res) => {
    //Validacion 
    await check('email').isEmail().withMessage('El email es obligatorio').run(req);
    await check('password').notEmpty().withMessage('El password es Obligatorio').run(req);

    let resultado = validationResult(req);

    if(!resultado.isEmpty()){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })
    }

    const {email, password} = req.body;
    //Comprobar si usuario existe
    const usuario = await Usuario.findOne({where: {email}});

    if(!usuario){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario no existe'}],
        })
    }

    //Comprobar si el usuario esta confirmado
    if(!usuario.confirmado){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'Tu cuenta no ha sido confirmada'}],
        })
    }

    //Revisar el password
    if(!usuario.verificarPassword(password)){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El password es incorrecto'}],
        })
    }

    //Autenticar el usuario
    const token = generarJWT(usuario.id);

    //Almacenar token en un cookie
    return res.cookie('_token', token, {
        httpOnly: true,
        // secure: true
    }).redirect('/mis-propiedades');
}

const cerrarSesion = (req, res) => {
    return res.clearCookie('_token').status(200).redirect('/auth/login');
}

const formularioRegistro = (req, res) => {

    res.render('auth/registro' , {
        pagina: 'Crear Cuenta',
        csrfToken: req.csrfToken() 
    });
}

const registrar = async(req, res) => {
    //Validacion
    await check('nombre').notEmpty().withMessage('El nombre es obligatorio').run(req);
    await check('email').isEmail().withMessage('Eso no parece un email').run(req);
    await check('password').isLength({min: 6}).withMessage('El password debe ser de al menos 6 caracteres').run(req);
    await check('repetir_password').equals(req.body.password).withMessage('Los password no son iguales').run(req)

    let resultado = validationResult(req);

    if(!resultado.isEmpty()){
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email,
            }
        })
    }

    const {nombre, email, password} = req.body;

    const existeUsuario = await Usuario.findOne({where: {email}});

    if(existeUsuario){
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario ya está registrado'}],
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email,
            }
        })
    }

    const usuario = await Usuario.create({
        nombre,
        email, 
        password,
        token: generarId()
    })

    //Envia email de confirmación
    emailRegistro({
        nombre: usuario.nombre,
        email: usuario.email,
        token: usuario.token
    })

    //Mensaje de confirmación
    res.render('templates/mensaje', {
        pagina: 'Cuenta Creada Correctamente',
        mensaje: 'Hemos enviado un Email de confirmación, presiona en el enlace'
    })
}

//Confirmar cuenta
const confirmar = async (req, res, next) => {
    const {token} = req.params;

    //Verificar si el token es válido
    const usuario = await Usuario.findOne({where: {token}});

    if(!usuario){
        return res.render('auth/confirmar-cuenta',{
            pagina: 'Error al confirmar tu cuenta',
            mensaje: 'Hubo un error al confirmar tu cuenta, intenta de nuevo',
            error: true
        })
    }

    //Confirmar la cuenta
    usuario.token = null;
    usuario.confirmado = true;
    await usuario.save();

    res.render('auth/confirmar-cuenta',{
        pagina: 'Cuenta confirmada',
        mensaje: 'La cuenta se confirmó correctamente'
    })

}

const formularioOlvidePassword = (req, res) => {
    res.render('auth/olvide-password' , {
        pagina: 'Recupera tu Acceso a Bienes Raices',
        csrfToken: req.csrfToken() 
    });
}

const resetPassword = async (req, res) => {
     //Validacion
    await check('email').isEmail().withMessage('Eso no parece un email').run(req);

    let resultado = validationResult(req);

    if(!resultado.isEmpty()){
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu Acceso a Bienes Raices',
            csrfToken: req.csrfToken(),
            errores: resultado.array()
        })
    }

    //Buscar el usuario
    const {email} = req.body;
    const usuario = await Usuario.findOne({where: {email}});

    if(!usuario){
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu Acceso a Bienes Raices',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El email no pertenece a ningún usuario'}]
        })
    }

    //Generar token y enviar el email
    usuario.token = generarId();
    await usuario.save();

    //Enviar un email
    emailOlvidePassword({
        email: usuario.email,
        nombre: usuario.nombre,
        token: usuario.token
    })

    //Renderizar mensaje
    res.render('templates/mensaje', {
        pagina: 'Reestablece tu Password',
        mensaje: 'Hemos enviado un Email con las instrucciones'
    })

}

const comprobarToken = async(req, res) => {
    const {token} = req.params;

    const usuario = await Usuario.findOne({where: {token}});

    if(!usuario){
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Reestablece tu Password',
            mensaje: 'Hubo un error al validar tu información',
            error: true
        })
    }

    //Mostrar formulario para modificar el password
    res.render('auth/reset-password', {
        pagina: 'Reestablece tu Password',
        csrfToken: req.csrfToken(),
    })
}
const nuevoPassword = async(req, res) => {
    //Validar el password
    await check('password').isLength({min: 6}).withMessage('El password debe ser de al menos 6 caracteres').run(req);

    let resultado = validationResult(req);

    if(!resultado.isEmpty()){
        return res.render('auth/reset-password', {
            pagina: 'Reestablece tu Password',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })
    }

    const {token} = req.params;
    const {password} = req.body;

    //Identificar quien hace el cambio
    const usuario = await Usuario.findOne({where: {token}});

    //Hashear el password
    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(password, salt);
    usuario.token = null;

    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Password Reestablecido',
        mensaje: 'El password se guardó correctamente'
    })
}

export {
    formularioLogin,
    autenticar,
    cerrarSesion,
    formularioRegistro,
    registrar,
    confirmar,
    formularioOlvidePassword,
    resetPassword,
    comprobarToken,
    nuevoPassword
}