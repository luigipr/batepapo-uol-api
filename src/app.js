import  express  from "express";
import cors from 'cors';
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv"

const app = express()
app.use(cors())
app.use(express.json())
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
 .then(() => db = mongoClient.db("batePapoUol"))
 .catch((err) => console.log(err.message));


app.post("/participants", async (req, res) => {
    const name = req.body.name
    if(!name) return res.sendStatus(422)
    //salvar participante na collection de participantes
    let time = (dayjs().format('HH:mm:ss'))
    const message = { 
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: time
}
    try {
        const res = await db.collection("participants").findOne({name});
        if (res) { return sendStatus(422)}
        //salvar no mongodb na coleção de participantes
        await db.collection("participants").insertOne({name})
        //salvar a mensagem de entrar na sala
        await db.collection("messages").insertOne(message)
        return sendStatus(201)
    } catch (err) {
        return res.sendStatus(404)
    }
})



app.get("/participants", async (req, res) => {    
    try {   
        const participants = db.collection("participants").find({}).toArray;
        res.status(200).send(participants)
    } catch (err) {
        res.status(500)
    }
})



app.post("/messages", async (req , res) => {
    const {to, text, type} = req.body;
    const from = req.headers.user;
    try {
    if (!to || !text || type !== 'message' || type !== 'private_message'){
        return res.sendStatus(422);
    }
    const res = await db.collection("participants").findOne({from});
    if (res) { return sendStatus(422)}
    const time = (dayjs().locale('pt-br').format('HH:mm:ss'));

    const message = {
        from, to, text, type, time
    }
    await db.collection("messages").insertOne(message);
    return sendStatus(201);
    } catch (err) {
        return res.sendStatus(404)
    }

})

app.get("/messages" , async (req,res) => {
    
    

})



const PORT = 5000
app.listen(PORT, console.log(`Servidor rodando na porta ${PORT}`))