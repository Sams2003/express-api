const express = require('express')
const oracledb = require('oracledb')
//const CORS = require('cors')

//1. variables de la api

const app = express()
const port = 3000

const dbConfig = {
    user: 'ferreteria',
    password : 'ferreteria',
    connectString: 'localhost/orcl1'
}

const API_KEY = 'ferreadmin123';

function validarApiKey(req, res, next){
    const apiKey = req.headers['x-api-key']
    if(!apiKey || apiKey !== API_KEY){
        return res.status(401).json({error: "API KEY incorrecta o no entregada"})
    }
    next()
}


//2. Middleware
app.use(express.json())
//app.use(cors())


//3. Endpoints
app.get('/', (req, res) => {
    res.status(200).json( {"mensaje": "Hola express 2"} )
})


app.get('/personas', validarApiKey ,async(req,res) => {
    let cone
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute("Select * From persona")
        res.json(result.rows.map(row =>({
            rut: row[0],
            nombre: row[1],
            appaterno: row[2],
            apmaterno: row[3],
            correo: row[4],
            genero: row[5],
            fec_nac: row[6],
            telefono: row[7],
            direccion: row[8]
        })))

    } catch (ex){
        res.status(500).json({error: ex.message})
    } finally{
        if (cone) await cone.close()
    }
})

app.get('/personas/:rut', validarApiKey, async(req,res) =>{
    let cone
    const rut = parseInt(req.params.rut)
    try{
        cone= await oracledb.getConnection(dbConfig)
        const result = await cone.execute("Select * From persona Where rut = :rut", [rut])

        if(result.rows.length===0){
            res.status(404).json({mensaje: "Persona no encontrada"})
        }else{
            const row = result.rows[0]
            res.json({
                rut: row[0],
                nombre: row[1],
                appaterno: row[2],
                apmaterno: row[3],
                correo: row[4],
                genero: row[5],
                fec_nac: row[6],
                telefono: row[7],
                direccion: row[8]
            })
        }
    }catch (error){
        res.status(500).json({error: error.message})
    }finally{
        if (cone) await cone.close()
    }
})

app.post('/personas',validarApiKey, async(req,res) =>{
    let cone
    const {rut,nombre,appaterno,apmaterno,correo,genero,fec_nac,telefono,direccion} = req.body
    console.log("REQ BODY:", req.body); // 👈 Esto debería imprimirse en consola al hacer el POST

    try{
        cone = await oracledb.getConnection(dbConfig)
        await cone.execute(
            `INSERT INTO persona
            Values(:rut, :nombre, :appaterno, :apmaterno, :correo, :genero, :fec_nac, :telefono, :direccion )`,
            {rut, nombre, appaterno, apmaterno, correo, genero, fec_nac, telefono, direccion},
            {autoCommit: true}
        )

        res.status(201).json({mensaje: "Persona Creada"})
    }catch(error){
        res.status(500).json({error: error.message})
    }finally{
       if (cone) cone.close()
    }
})

app.put('/personas/:rut',validarApiKey, async(req, res)=>{
    let cone
    const rut = parseInt(req.params.rut)
    const {nombre,appaterno,apmaterno,correo,genero,fec_nac,telefono,direccion} = req.body
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(`UPDATE persona
            Set nombre = :nombre, appaterno = :appaterno, apmaterno = :apmaterno, correo = :correo,
            genero = :genero, fec_nac = :fec_nac, telefono = :telefono, direccion = :direccion
            WHERE rut = :rut`,
            {rut, nombre, appaterno, apmaterno, correo, genero, fec_nac, telefono, direccion},
            {autoCommit: true})
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "Persona no encontrada"})
        }else{
            res.json({mensaje: "Usuario actualizado con éxito"})
        }
    }catch (error){
       res.status(500).json({error: error.message})
    }finally{
        if (cone) cone.close()
    }
})


app.delete('/personas/:rut', async (req, res)=>{
    let cone
    const rut = parseInt(req.params.rut)
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(`DELETE FROM persona WHERE rut = :rut`,
            [rut],
            {autoCommit: true}
        )
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "Usuario no encontrado"})
        }else{
            res.json({mensaje: "Usuario eliminado"})
        }


    }catch (error){
        res.status(500).json({error: error.message})
    }finally{
        if (cone) cone.close()
    }
})


app.patch('/personas/:rut', async(req,res) => {
    let cone
    const rut = parseInt(req.params.rut)
    const {nombre,appaterno,apmaterno,correo,genero,fec_nac,telefono,direccion} = req.body
    try{
        cone = await oracledb.getConnection(dbConfig)
        let campos = []
        let valores = {}
        if (nombre !==undefined){
            campos.push('nombre = :nombre')
            valores.nombre = nombre
        }
        if (appaterno !==undefined){
            campos.push('appaterno = :appaterno')
            valores.appaterno = appaterno
        }
        if (apmaterno !==undefined){
            campos.push('apmaterno = :apmaterno')
            valores.apmaterno = apmaterno
        }
        if (correo !==undefined){
            campos.push('correo = :correo')
            valores.correo = correo
        }
        if (genero !==undefined){
            campos.push('genero = :genero')
            valores.genero = genero
        }
        if (fec_nac !==undefined){
            campos.push('fec_nac = :fec_nac')
            valores.fec_nac = fec_nac
        }
        if (telefono !==undefined){
            campos.push('telefono = :telefono')
            valores.telefono = telefono
        }
        if (direccion !==undefined){
            campos.push('direccion = :direccion')
            valores.direccion = direccion
        }
        if(campos.length===0){
            res.status(400).json({mensaje: 'No se enviaron campos para actualizar'})
        }
        valores.rut = rut
        const sql = `UPDATE persona SET ${campos.join(', ')} WHERE rut = :rut`
        const result = await cone.execute(sql, valores, {autoCommit: true})
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "El usuario no existe"})
        }else{
            res.json({mensaje: "El usuario se actualizo parcialmente"})
        }
    }catch (error) {
        res.status(500).json({error:error.message})
    }finally{
        if (cone) cone.close()
    }
})

app.listen(port, () => {
    console.log(`API escuchando en puerto ${port}`);
})