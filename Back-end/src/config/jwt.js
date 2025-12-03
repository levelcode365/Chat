import jwt from 'jsonwebtoken';


const segredo = process.env.JWT_SECRET || 'segredo_forte';

export function gerarToken(dados) {
    return jwt.sign(dados, segredo, { expiresIn: '1h' });
}

export function verificarToken(token) {
    return jwt.verify(token, segredo);
}

