import  express  from "express";
import cors from 'cors';
import dayjs from "dayjs";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv"
import { stripHtml } from "string-strip-html";



const app = express()
app.use(cors())
app.use(express.json())
dotenv.config();

let dtime

setInterval(() => {
    dtime = dayjs().format("HH:mm:ss")
}, 10)

setInterval(deleteUsers, 15000)

async function deleteUsers() {
    
    try{
    const participants = await db.collection("participants").find().toArray();
    console.log('deletando usuarios inativos...')
    console.log(participants)
     

    participants.forEach( async participant => {
        
        if (Date.now() - participant.lastStatus > 10000) {           
            console.log(participant)    
            const message = await db.collection("messages").insertOne({ from: participant.name, to: 'Todos',
            text: 'sai da sala...',
            type: 'status',
            time: dtime})
            console.log(message)
            await db.collection("participants").deleteOne({ _id: new ObjectId(participant._id) })
            console.log('usuario deletado')
        }
    })
    
    } catch (error) {
        console.log(error)
    }
}

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
        from:  name,
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
        await db.collection("participants").insertOne({ name: (stripHtml(name).result).trim(), lastStatus: Date.now() })
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
    if (!response) return res.status(422).send('mensagem não encontrada')
    if (response.name !== user) res.status(422).send('usuario não cadastrado')
    
    const message = {
        _id: new ObjectId(),from: user, to: to, text: (stripHtml(text).result).trim(), type: type, time: time
    }
    console.log(message)

    try {   
    await db.collection("messages").insertOne(message);
    return res.sendStatus(201);

    } catch (err) {
        return res.status(422).send(console.log(err))
    }

})

app.get("/messages?:limit" , async (req,res) => {
    const user = req.headers.user
    const limit = req.query.limit
    console.log(user)
    console.log(limit)
    
    try {
        const response = await db.collection("participants").findOne({ name: user })
        if (!response) return res.status(409).send(err => console.log(err))
        const messages = await db.collection("messages").find( { $or: [{to: "Todos"}, {from: user}, {to: user}]}).toArray();
        if ((limit && limit <= 0 )|| (limit && isNaN(limit))) return res.sendStatus(422)
        if (!limit) {res.status(200).send(messages.reverse())}
        return res.status(200).send(messages.reverse().slice(0, limit))
        } catch (err) {
            return res.status(500).send(console.log(err))
        }
    }
)

app.post("/status", async (req, res) => {
    const user = req.headers.user
    console.log(user)
    if (!user) return res.sendStatus(404);

    try{  
        const response = await db.collection("participants").findOne({ name: user })
        if (!response) return res.sendStatus(404)
        await db.collection("participants").updateOne({ name: user }, { $set: { lastStatus : Date.now()} })
        res.sendStatus(200)
    } catch (err) {
        return res.status(404).send(console.log(err));
    }
})


app.delete("/messages/:id", async (req,res) => {
    const user = req.headers.user;
    const id = req.params;
    try {    
    const response = await db.collection("messages").findOne({ _id: new ObjectId(id) })
    if (!response) return res.status(404).send('Essa mensagem não existe')
    if (response.from !== user) return res.sendStatus(401)
    const message = await db.collection("messages").deleteOne({ _id: new ObjectId(id) })
    //if (message.from !== user) return res.sendStatus(401)
    if (message.deletedCount === 0) return res.status(404).send("Essa mensagem não existe!")

    res.status(200).send("Receita deletada com sucesso!")
    } catch (err) {
        return res.status(404).send(console.log(err));
    }
})

app.put("/messages/:id", async (req, res) => {
    const from = req.headers.user;
    const {to, text, type} = req.body;
    const id = req.params;

    const response = await db.collection("messages").findOne({ _id: new ObjectId(id) })
    if (!response) return res.status(404).send('mensagem não encontrada')
    if (!to || !text || (type !== 'message' && type !== 'private_message' && type !== 'status')) return res.sendStatus(422)
    if (response.from !== from) return res.sendStatus(401)
    //if (!response) return res.sendStatus(404)
    try {
        const result = await db.collection("messages").updateOne({ _id: new ObjectId(id) }, { $set: {  text } })
        if (result.matchedCount === 0) return res.status(404).send("Esta mensagem não existe")
        res.status(200).send("mensagem editada com sucesso")
    } catch (err) {
        return res.status(404).send(console.log(err));
    }
})

app.listen(process.env.PORT, console.log(`Servidor rodando na porta ${process.env.PORT}`))