import jwt from "jsonwebtoken";

export default function autenticarJWT(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            erro: "Token não fornecido"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SEGREDO);
        req.usuario = decoded;
        next();
    } catch (err) {
        return res.status(403).json({
            erro: "Token inválido"
        });
    }
}
