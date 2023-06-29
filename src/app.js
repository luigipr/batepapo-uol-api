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
        return res.sendStatus(201)
    } catch (err) {       
        return res.status(500).send(console.log(err))
    }
})



app.get("/participants", async (req, res) => {    
    try {   
        const participants = await db.collection("participants").find({}).toArray();
        res.status(200).send(participants)
    } catch (err) {
        return res.status(500).send(console.log(err))
    }
})



app.post("/messages", async (req , res) => {
    const {to, text, type} = req.body;
    const user = req.headers.user;
    const time = (dayjs().format('HH:mm:ss'))
    console.log(user)
    console.log(time)
    console.log(to, text, type)

    if (!to || !text || (type !== 'message' && type !== 'private_message' && type !== 'status') || !user) return res.sendStatus(422);
    const response = await db.collection("participants").findOne({ name: user});
    console.log(response)
    if (!response) return res.status(409).send(err => console.log(err))
    
    const message = {
        from: user, to: to, text: text, type: type, time: time
    }
    console.log(message)

    try {   
    await db.collection("messages").insertOne(message);
    return res.sendStatus(201);

    } catch (err) {
        return res.status(500).send(console.log(err))
    }

})

app.get("/messages?:limit" , async (req,res) => {
    const user = req.headers.user
    const limit = req.query.limit
    console.log(user)
    console.log(limit)
    
    try {
        const resp = await db.collection("participants").findOne({ name: user })
        if (!resp) return res.status(409).send(err => console.log(err))
        const messages = await db.collection("messages").find( { $or: [{to: "Todos"}, {from: user}, {to: user}]}).toArray();
        if ((limit && limit <= 0 )|| (limit && isNaN(limit))) return res.sendStatus(422)
        if (!limit) {res.status(200).send(messages.reverse())}
        return res.status(200).send(messages.reverse().slice(0, limit))
        } catch (err) {
            return res.status(500).send(console.log(err))
        }
    }
)





app.listen(process.env.PORT, console.log(`Servidor rodando na porta ${process.env.PORT}`))