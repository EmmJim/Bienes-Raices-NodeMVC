import bcrypt from 'bcrypt';

const usuarios = [
    {
        nombre: 'Juan',
        email: 'correo3@correo.com',
        confirmado: 1,
        password: bcrypt.hashSync('password', 10)
    },
    {
        nombre: 'Said',
        email: 'correo2@correo.com',
        confirmado: 1,
        password: bcrypt.hashSync('password', 10)
    }
]

export default usuarios;