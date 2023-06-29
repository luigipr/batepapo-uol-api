import  express  from "express";
import cors from 'cors';
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv"


const app = express()
app.use(cors())
app.use(express.json())
dotenv.config();

let hour

setInterval(() => {
    hour = dayjs().format("HH:mm:ss")

}, 1)

const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
	await mongoClient.connect()
	console.log("MongoDB conectado!")
} catch (err) {
	(err) => console.log(err.message)
}
const db = mongoClient.db()

app.post("/participants", async (req, res) => {
    const name = req.body.name
    console.log(name)
    if(!name || typeof name !== 'string') {return res.sendStatus(422)}
    //salvar participante na collection de participantes
    const time = (dayjs().format('HH:mm:ss'))
    const message = { 
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: time
}
    try {
        const user = await db.collection("participants").findOne({name: name});
        console.log(user)
        if (user) {return res.status(409).send("esse participante já existe")}
        //salvar no mongodb na coleção de participantes
        await db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })
        //salvar a mensagem de entrar na sala
        await db.collection("messages").insertOne(message)
        return sendStatus(201)
    } catch (err) {
        return res.sendStatus(500)
    }
})



app.get("/participants", async (req, res) => {    
    try {   
        const participants = db.collection("participants").find({}).toArray();
        res.status(200).send(participants)
    } catch (err) {
        res.status(500)
    }
})



app.post("/messages", async (req , res) => {
    const {to, text, type} = req.body;
    const user = req.headers.user;

    if (!to || !text || type !== 'message' || type !== 'private_message') return res.sendStatus(422);
    
    try {
    
    const res = await db.collection("participants").findOne({ name: user.name});
    if (res) return sendStatus(422)

    const time = (dayjs().locale('pt-br').format('HH:mm:ss'));

    const message = {
        from, to, text, type, time
    }
    await db.collection("messages").insertOne(message);
    return sendStatus(201);
    } catch (err) {
        return res.sendStatus(500)
    }

})

app.get("/messages" , async (req,res) => {
    const user = req.headers.user

    try {
    const messages = await db.collection("messages").find( { $or: [{to: "Todos"}, {from: user.name}, {to: user.name}]}).toArray();
    const listMessages = messages.reverse();
    res.status(200).send(listMessages)
    } catch (err) {
        return res.sendStatus(500)
    }

})

app.get("/messages/:limit",async (req, res) => {
    const limit = req.params.limit
    
    if (!limit) {
        const messages = await db.collection("messages").find({}).toArray();
        return res.status(200).send(messages)
    }

    try {
    const messages = await db.collection("messages").find().toArray();
    const limitMessages = messages.slice(0, limit)
    return res.status(200).send(limitMessages)
    } catch {
        return res.sendStatus(500)
    }
})

app.listen(process.env.PORT, console.log(`Servidor rodando na porta ${process.env.PORT}`))