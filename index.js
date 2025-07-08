const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const bcrypt = require('bcrypt'); // For password hashing
const jwt = require('jsonwebtoken'); // For token-based authentication

// 1. Variables de la API
const app = express();
const port = 3000;

const dbConfig = {
    user: 'ferremas', // Updated from 'ferreteria'
    password: 'ferremas', // Updated from 'ferreteria'
    connectString: 'localhost/orcl1' // Updated from 'localhost/orcl1'
};

// Secret key for JWT. IMPORTANT: In a production environment, this should be a strong,
// randomly generated string stored securely (e.g., environment variable).
const JWT_SECRET = 'your_jwt_secret_key_very_secure'; // ¡Cambia esto en producción!
const API_KEY = 'Admin1234'; // Static API Key for initial access or specific services

// Middleware para validar API Key o JWT
async function validarAcceso(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    // Check for static API Key first
    if (apiKey && apiKey === API_KEY) {
        console.log('Access granted via static API Key.');
        return next();
    }

    // If no static API Key, check for JWT
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Attach user information from token to the request
            req.user = decoded;
            // If a valid JWT is provided, grant access.
            console.log(`Access granted via JWT for user: ${req.user.correo} (${req.user.tipo_persona}).`);
            return next();
        } catch (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(401).json({ error: "Token inválido o expirado." });
        }
    }

    // If neither API Key nor valid JWT is provided
    console.log('Access denied: No valid API Key or JWT provided.');
    return res.status(401).json({ error: "API KEY o Token de autenticación requerido." });
}


// 2. Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for all origins (adjust in production for specific origins)


// 3. Endpoints

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({ "mensaje": "Hola express 2 - API Ferreteria" });
});

// Login Endpoint (Ahora autentica por correo)
app.post('/login', async (req, res) => {
    let connection;
    const { correo, contrasena } = req.body; // Changed 'password' to 'contrasena'

    if (!correo || !contrasena) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
    }

    try {
        connection = await oracledb.getConnection(dbConfig);
        // Consulta por correo en lugar de rut
        const result = await connection.execute(
            `SELECT rut, nombre, correo, contraseña, tipo_persona FROM persona WHERE correo = :correo`,
            [correo]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = {
            rut: result.rows[0][0],
            nombre: result.rows[0][1],
            correo: result.rows[0][2],
            hashedContrasena: result.rows[0][3], // Changed 'hashedPassword' to 'hashedContrasena'
            tipo_persona: result.rows[0][4]
        };

        // Compare provided contrasena with hashed contrasena from DB
        const isMatch = await bcrypt.compare(contrasena, user.hashedContrasena); // Changed 'password' to 'contrasena'

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { rut: user.rut, nombre: user.nombre, correo: user.correo, tipo_persona: user.tipo_persona }, // Incluye correo en el token
            JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.status(200).json({ mensaje: 'Inicio de sesión exitoso.', token: token, user: { rut: user.rut, nombre: user.nombre, correo: user.correo, tipo_persona: user.tipo_persona } });

    } catch (ex) {
        console.error('Error during login:', ex);
        res.status(500).json({ error: ex.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// Protected routes (require API Key or Admin JWT)
app.get('/personas', validarAcceso, async (req, res) => {
    let cone;
    try {
        cone = await oracledb.getConnection(dbConfig);
        // Added 'contraseña' to the SELECT statement
        const result = await cone.execute("Select rut, nombre, appaterno, apmaterno, correo, contraseña, genero, fec_nac, telefono, direccion, tipo_persona From persona");
        res.json(result.rows.map(row => ({
            rut: row[0],
            nombre: row[1],
            appaterno: row[2],
            apmaterno: row[3],
            correo: row[4],
            contrasena: row[5], // Added 'contrasena' here
            genero: row[6],
            fec_nac: row[7],
            telefono: row[8],
            direccion: row[9],
            tipo_persona: row[10]
        })));
    } catch (ex) {
        res.status(500).json({ error: ex.message });
    } finally {
        if (cone) await cone.close();
    }
});

app.get('/personas/:rut', validarAcceso, async (req, res) => {
    let cone;
    const rut = req.params.rut; // Keep as string for VARCHAR2
    try {
        cone = await oracledb.getConnection(dbConfig);
        // Added 'contraseña' to the SELECT statement
        const result = await cone.execute(
            "Select rut, nombre, appaterno, apmaterno, correo, contraseña, genero, fec_nac, telefono, direccion, tipo_persona From persona Where rut = :rut",
            [rut]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ mensaje: "Persona no encontrada" });
        } else {
            const row = result.rows[0];
            res.json({
                rut: row[0],
                nombre: row[1],
                appaterno: row[2],
                apmaterno: row[3],
                correo: row[4],
                contrasena: row[5], // Added 'contrasena' here
                genero: row[6],
                fec_nac: row[7],
                telefono: row[8],
                direccion: row[9],
                tipo_persona: row[10]
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) await cone.close();
    }
});

app.post('/personas', validarAcceso, async (req, res) => {
    let cone;
    const { rut, nombre, appaterno, apmaterno, correo, contrasena, genero, fec_nac, telefono, direccion, tipo_persona } = req.body; // Changed 'password' to 'contrasena'
    console.log("REQ BODY:", req.body);

    if (!contrasena) { // Changed 'password' to 'contrasena'
        return res.status(400).json({ error: 'La contraseña es requerida para crear una persona.' });
    }

    try {
        // Hash the contrasena before storing
        const hashedContrasena = await bcrypt.hash(contrasena, 10); // Changed 'password' to 'contrasena', 'hashedPassword' to 'hashedContrasena'

        cone = await oracledb.getConnection(dbConfig);
        await cone.execute(
            `INSERT INTO persona (rut, nombre, appaterno, apmaterno, correo, contraseña, genero, fec_nac, telefono, direccion, tipo_persona)
             VALUES (:rut, :nombre, :appaterno, :apmaterno, :correo, :hashedContrasena, :genero, TO_DATE(:fec_nac, 'YYYY-MM-DD'), :telefono, :direccion, :tipo_persona)`, // Changed 'hashedPassword' to 'hashedContrasena'
            { rut, nombre, appaterno, apmaterno, correo, hashedContrasena, genero, fec_nac, telefono, direccion, tipo_persona }, // Changed 'hashedPassword' to 'hashedContrasena'
            { autoCommit: true }
        );

        res.status(201).json({ mensaje: "Persona Creada con éxito." });
    } catch (error) {
        console.error('Error creating persona:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) cone.close();
    }
});

app.put('/personas/:rut', validarAcceso, async (req, res) => {
    let cone;
    const rut = req.params.rut;
    const { nombre, appaterno, apmaterno, correo, contrasena, genero, fec_nac, telefono, direccion, tipo_persona } = req.body; // Changed 'password' to 'contrasena'

    try {
        cone = await oracledb.getConnection(dbConfig);

        let hashedContrasena; // Changed 'hashedPassword' to 'hashedContrasena'
        if (contrasena) { // Changed 'password' to 'contrasena'
            hashedContrasena = await bcrypt.hash(contrasena, 10); // Changed 'password' to 'contrasena'
        }

        const sql = `UPDATE persona
                     SET nombre = :nombre, appaterno = :appaterno, apmaterno = :apmaterno, correo = :correo,
                         contraseña = COALESCE(:hashedContrasena, contraseña),
                         genero = :genero, fec_nac = TO_DATE(:fec_nac, 'YYYY-MM-DD'), telefono = :telefono,
                         direccion = :direccion, tipo_persona = :tipo_persona
                     WHERE rut = :rut`;

        const bindVars = {
            nombre, appaterno, apmaterno, correo,
            hashedContrasena: hashedContrasena || null, // Changed 'hashedPassword' to 'hashedContrasena'
            genero, fec_nac, telefono, direccion, tipo_persona, rut
        };

        const result = await cone.execute(sql, bindVars, { autoCommit: true });

        if (result.rowsAffected === 0) {
            res.status(404).json({ mensaje: "Persona no encontrada" });
        } else {
            res.json({ mensaje: "Usuario actualizado con éxito" });
        }
    } catch (error) {
        console.error('Error updating persona:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) cone.close();
    }
});


app.delete('/personas/:rut', validarAcceso, async (req, res) => {
    let cone;
    const rut = req.params.rut;
    try {
        cone = await oracledb.getConnection(dbConfig);
        const result = await cone.execute(
            `DELETE FROM persona WHERE rut = :rut`,
            [rut],
            { autoCommit: true }
        );
        if (result.rowsAffected === 0) {
            res.status(404).json({ mensaje: "Usuario no encontrado" });
        } else {
            res.json({ mensaje: "Usuario eliminado" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) cone.close();
    }
});


app.patch('/personas/:rut', validarAcceso, async (req, res) => {
    let cone;
    const rut = req.params.rut;
    const { nombre, appaterno, apmaterno, correo, contrasena, genero, fec_nac, telefono, direccion, tipo_persona } = req.body; // Changed 'password' to 'contrasena'
    try {
        cone = await oracledb.getConnection(dbConfig);
        let campos = [];
        let valores = {};

        if (nombre !== undefined) {
            campos.push('nombre = :nombre');
            valores.nombre = nombre;
        }
        if (appaterno !== undefined) {
            campos.push('appaterno = :appaterno');
            valores.appaterno = appaterno;
        }
        if (apmaterno !== undefined) {
            campos.push('apmaterno = :apmaterno');
            valores.apmaterno = apmaterno;
        }
        if (correo !== undefined) {
            campos.push('correo = :correo');
            valores.correo = correo;
        }
        if (contrasena !== undefined) { // Changed 'password' to 'contrasena'
            const hashedContrasena = await bcrypt.hash(contrasena, 10); // Changed 'password' to 'contrasena', 'hashedPassword' to 'hashedContrasena'
            campos.push('contraseña = :hashedContrasena'); // Changed 'hashedPassword' to 'hashedContrasena'
            valores.hashedContrasena = hashedContrasena; // Changed 'hashedPassword' to 'hashedContrasena'
        }
        if (genero !== undefined) {
            campos.push('genero = :genero');
            valores.genero = genero;
        }
        if (fec_nac !== undefined) {
            campos.push("fec_nac = TO_DATE(:fec_nac, 'YYYY-MM-DD')"); // Ensure date format
            valores.fec_nac = fec_nac;
        }
        if (telefono !== undefined) {
            campos.push('telefono = :telefono');
            valores.telefono = telefono;
        }
        if (direccion !== undefined) {
            campos.push('direccion = :direccion');
            valores.direccion = direccion;
        }
        if (tipo_persona !== undefined) {
            campos.push('tipo_persona = :tipo_persona');
            valores.tipo_persona = tipo_persona;
        }

        if (campos.length === 0) {
            return res.status(400).json({ mensaje: 'No se enviaron campos para actualizar' });
        }

        valores.rut = rut;
        const sql = `UPDATE persona SET ${campos.join(', ')} WHERE rut = :rut`;
        const result = await cone.execute(sql, valores, { autoCommit: true });

        if (result.rowsAffected === 0) {
            res.status(404).json({ mensaje: "El usuario no existe" });
        } else {
            res.json({ mensaje: "El usuario se actualizo parcialmente" });
        }
    } catch (error) {
        console.error('Error patching persona:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (cone) cone.close();
    }
});

app.listen(port, () => {
    console.log(`API escuchando en puerto ${port}`);
});
