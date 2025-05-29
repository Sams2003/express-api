const express = require('express')
const oracledb = require('oracledb')
const CORS = require('cors')








const app = express()
const port = 3000
const dbConfig = {
    user: 'ferreteria',
    password : 'ferreteria',
    connectString: 'localhost'
}








app.use(express.json())
app.use(cors())








app.get('/personas',async(req,res) => {
    let cone
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute("Select * From persona")
        res.json(result.rows.map(row =>({
            rut: row[0],
            nombre: row[1],
            appaterno: row[2],
            apmaterno: row[3],
            correo: row[6],
            genero: row[7],
            fec_nac: row[8],
            telefono: row[9],
            direccion: row[10]
        })))








    } catch (ex){
        res.status(500).json({error: ex.message})
    } finally{
        if (cone) await cone.close()
    }
})








app.get('/persona/:rut', async(req,res) =>{
    let cone
    const rut = parseInt(req.params.rut)
    try{
        cone= await oracledb.getConnection(dbConfig)
        const result = await cone.execute("Select * From persona Where rut = :rut", [rut])
        if(result.rows.length==0){
            res.status(404).json({mensaje: "Persona no encontrada"})
        }else{
            const row = result.row[0]
            res.json({
                rut: row[0],
                nombre: row[1],
                appaterno: row[2],
                apmaterno: row[3],
                correo: row[6],
                genero: row[7],
                fec_nac: row[8],
                telefono: row[9],
                direccion: row[10]
            })
        }
    }catch (error){
        res.status(500).json({error: error.message})
    }finally{
        if (cone) await cone.close()
    }
})








app.post('/persona', async(req,res) =>{
    let cone
    const {rut,nombre,appaterno,apmaterno,correo,genero,fec_nac,telefono,direccion} = req.body
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




app.put('personas/:rut', async(req, res)=>{
    let cone
    const rut = parseInt(req.params.rut)
    const {nombre,appaterno,apmaterno,correo,genero,fec_nac,telefono,direccion} = req.body
    try{
        cone = await oracledb.getConnection(dbConfig)
        const result = await cone.execute(`UPDATE persona
            Set nombre = :nombre, appaterno = :appaterno, apmaterno = :apmaterno, correo = :correo, genero = :genero, fec_nac = :fec_nac, telefono = :telefono, direccion = :direccion
            WHERE rut = :rut`,
            {rut, nombre, appaterno, apmaterno, correo, genero, fec_nac, telefono, direccion},
            {autoCommit: true})
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "Persona no encontrada"})
        }
    }catch{
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
        const result = await cone.execute(`DELETE * FROM persona WHERE rut = :rut`,
            [rut],
            {autoCommit: true}
        )
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "Persona no encontrada"})
        }else{
            res.json({mensaje: "Persona eliminada"})
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
            valores.nombre = direccion
        }
        valores.rut = rut
        const sql = `UPDATE alumno SET ${campos.join(', ')} WHERE rut = :rut`
        const result = await cone.execute(sql, valores, {autoCommit: true})
        if(result.rowsAffected===0){
            res.status(404).json({mensaje: "persona no existe"})
        }else{
            res.json({mensaje: "Persona actualizado parcialmente"})
        }
    }catch (error) {
        res.status(500).json({error:error.message})
    }finally{
        if (cone) cone.close()
    }
})









