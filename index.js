const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const cors = require('cors')

app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://tripty:tripty2002@cluster0.9zsd7h2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const foodCollection = client.db('Charitydb').collection('foods')
        const foodRequests = client.db('Charitydb').collection('foodRequests')
        const confirmedCollection = client.db('Charitydb').collection('confirmed')
        const blogCollection = client.db('Charitydb').collection('Blogs')
        const userCollection = client.db('Charitydb').collection('Users')
        // const upwardCollection = client.db('Charitydb').collection('Upwards')
        // const downwardCollection = client.db('Charitydb').collection('Downwards')

        app.get('/', (req, res) => {
            res.send('welcome to charity server')
        })

        app.get('/items', async (req, res) => {
            try {
                const page = parseInt(req.query.page);
                const limit = parseInt(req.query.limit);
                const category = req.query.category;
                const skip = (page - 1) * limit;
                if (category === 'All' || category === '') {
                    const result = await foodCollection.find().skip(skip).limit(limit).toArray()
                    res.send(result)
                }
                const result = await foodCollection.find({ category: category }).skip(skip).limit(limit).toArray()
                res.send(result)
            }
            catch (error) {
                console.log(error)
            }
        })

        app.patch('/items/:id', async (req, res) => {
            const id = req.params.id;
            const reqQuantity = req.body.reqQuantity;
            const quantity = req.body.quantity
            const updateResult = parseInt(quantity) - parseInt(reqQuantity)
            const updateDoc = {
                $set: {
                    quantity: updateResult
                }
            }
            const result = await foodCollection.updateOne({ _id: new ObjectId(id) }, updateDoc)

            res.send(result)
        })

        app.get('/foodcount', async (req, res) => {
            const count = await foodCollection.estimatedDocumentCount()
            const foodCount = await foodCollection.countDocuments({ category: 'Food' })
            const clothCount = await foodCollection.countDocuments({ category: 'Clothes' })
            const groceryCount = await foodCollection.countDocuments({ category: 'Grocery Materials' })
            res.send({ count, foodCount, clothCount, groceryCount })
        })

        app.get('/managefoods/:email', async (req, res) => {
            const email = req.params.email;
            const qurery = { email: email };
            const result = await foodCollection.find(qurery).toArray()
            res.send(result)
        })

        app.get('/search', async (req, res) => {
            const searchTerm = req.query.q.split(' ');
            const result = await foodCollection.find({ foodName: { $in: searchTerm.map(term => (new RegExp(term, 'i'))) } }).toArray()
            res.send(result)
        })

        app.post('/addfood', async (req, res) => {
            const foodForm = req.body
            const result = await foodCollection.insertOne(foodForm)
            res.send(result)
        })
        app.get('/addfood/:id', async (req, res) => {
            const id = req.params.id;
            const qurery = { _id: new ObjectId(id) }
            const result = await foodCollection.findOne(qurery)
            res.send(result)
        })
        app.put('/addfood/:id', async (req, res) => {
            const id = req.params.id;
            const qurery = { _id: new ObjectId(id) }
            const updateForm = req.body;
            const updateDoc = {
                $set: {
                    foodName: updateForm.foodName,
                    photo: updateForm.photo,
                    quantity: updateForm.quantity,
                    location: updateForm.location,
                    date: updateForm.date,
                    message: updateForm.message
                }
            }
            const result = await foodCollection.updateOne(qurery, updateDoc)
            res.send(result)
        })

        app.delete('/addfood/:id', async (req, res) => {
            const id = req.params.id;
            const qurery = { _id: new ObjectId(id) }
            const result = await foodCollection.deleteOne(qurery);
            res.send(result)
        })
        app.get('/requests', async (req, res) => {
            const email = req.query.email;
            const qurery = { requestEmail: email }
            const result = await foodRequests.find(qurery).toArray()
            res.send(result)
        })


        app.delete('/requests/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await foodRequests.deleteOne(query)
            res.send(result)
        })

        app.post('/requests', async (req, res) => {
            const foodForm = req.body;
            const result = await foodRequests.insertOne(foodForm)
            res.send(result)
        })

        app.get('/requests/:foodid', async (req, res) => {
            const foodid = req.params.foodid;
            const email = req.query.email;
            const queryEmail = { email: email }
            const query = { fid: foodid };
            const result = await foodRequests.find(query, queryEmail).toArray()
            res.send(result)
        })

        // confirmed requests 

        app.get('/confirmed', async (req, res) => {
            const email = req.query.email
            const result = await confirmedCollection.find({ requestEmail: email }).toArray()
            res.send(result)
        })

        app.post('/confirmed', async (req, res) => {
            const doc = req.body;
            const result = await confirmedCollection.insertOne(doc)
            res.send(result)
        })

        //blog area

        app.post('/post-a-blog', async (req, res) => {
            const post = req.body;
            const result = await blogCollection.insertOne(post);
            res.send(result)
        })

        app.get('/all-blogs', async (req, res) => {
            const result = await blogCollection.find().toArray()
            res.send(result)
        })

        app.get('/all-blogs/:email', async (req, res) => {
            const email = req.params.email;
            const result = await blogCollection.find({ email: email }).toArray()
            res.send(result)
        })

        app.delete('/delete-Blog/:id', async (req, res) => {
            const id = req.params.id;
            const result = await blogCollection.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        app.post('/create-user', async (req, res) => {
            const email = req.body.email;
            const user = await userCollection.findOne({ email: email })
            if (!user) {
                const result = await userCollection.insertOne(req.body);
                res.send(result)
            }
            res.send({ message: "User Already Exists !!" })
        })

        // admin operation 
        app.get("/all-user", async (req, res)=>{
            res.send(await userCollection.find().toArray())
        })

        app.get('/userInfo/:email', async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email: email });
            res.send(result)
        })

        //upward and downward option 

        app.patch('/upward/:id/:email', async (req, res) => {
            try {
                const id = req.params.id;
                const email = req.params.email;

                // Find the blog by id
                const blog = await blogCollection.findOne({ _id: new ObjectId(id) });

                if (!blog) {
                    return res.status(404).send('Blog not found');
                }


                // Update the blog document by pushing the email to the upwards array
                const result = await blogCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $push: { upwards: email },
                        $pull: { downwards: email }
                    }
                );

                // Send the result back to the client
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });
        app.patch('/downward/:id/:email', async (req, res) => {
            try {
                const id = req.params.id;
                const email = req.params.email;

                // Find the blog by id
                const blog = await blogCollection.findOne({ _id: new ObjectId(id) });

                if (!blog) {
                    return res.status(404).send('Blog not found');
                }


                // Update the blog document by pushing the email to the upwards array
                const result = await blogCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $pull: { upwards: email },
                        $push: { downwards: email }
                    }
                );

                // Send the result back to the client
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.listen(port, () => {
    console.log("server listening on ", port)
})