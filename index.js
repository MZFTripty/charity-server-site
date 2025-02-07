const express = require('express')
const { SslCommerzPayment } = require('sslcommerz')
const app = express()
const port = process.env.PORT || 5000;
const cors = require('cors')
const { v4: uuidv4 } = require('uuid');
require("dotenv").config();

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
        const paymentCollection = client.db('Charitydb').collection('Payments')
        // const upwardCollection = client.db('Charitydb').collection('Upwards')
        // const downwardCollection = client.db('Charitydb').collection('Downwards')

        app.get('/', (req, res) => {
            res.send('welcome to charity server')
        })
        // Initialize payment
        app.post('/init', async (req, res) => {
            console.log("hitting")
            try {
                const productInfo = {
                    total_amount: req.body.total_amount,
                    currency: 'BDT',
                    tran_id: uuidv4(),
                    success_url: 'http://localhost:5000/success',
                    fail_url: 'http://localhost:5000/failure',
                    cancel_url: 'http://localhost:5000/cancel',
                    ipn_url: 'http://localhost:5000/ipn',
                    paymentStatus: 'pending',
                    shipping_method: 'Courier',
                    product_name: req.body.product_name,
                    product_category: 'Electronic',
                    product_profile: req.body.product_profile,
                    product_image: req.body.product_image,
                    cus_name: req.body.cus_name,
                    cus_email: req.body.cus_email,
                    cus_add1: 'Dhaka',
                    cus_add2: 'Dhaka',
                    cus_city: 'Dhaka',
                    cus_state: 'Dhaka',
                    cus_postcode: '1000',
                    cus_country: 'Bangladesh',
                    cus_phone: '01711111111',
                    cus_fax: '01711111111',
                    ship_name: req.body.cus_name,
                    ship_add1: 'Dhaka',
                    ship_add2: 'Dhaka',
                    ship_city: 'Dhaka',
                    ship_state: 'Dhaka',
                    ship_postcode: 1000,
                    ship_country: 'Bangladesh',
                    multi_card_name: 'mastercard',
                    value_a: 'ref001_A',
                    value_b: 'ref002_B',
                    value_c: 'ref003_C',
                    value_d: 'ref004_D'
                };

                // Insert order info
                const result = await paymentCollection.insertOne({
                    total_amount: req.body.total_amount,
                    product_name: req.body.product_name,
                    product_profile: req.body.product_profile,
                    product_image: req.body.product_image,
                    cus_name: req.body.cus_name,
                    cus_email: req.body.cus_email
                });

                console.log(productInfo)

                const sslcommer = new SslCommerzPayment(process.env.STORE_ID, process.env.STORE_PASSWORD, false) //true for live default false for sandbox
                sslcommer.init(productInfo).then(data => {
                    //process the response that got from sslcommerz 
                    //https://developer.sslcommerz.com/doc/v4/#returned-parameters
                    const info = { ...productInfo, ...data }
                    // console.log(info.GatewayPageURL);
                    if (info.GatewayPageURL) {
                        res.json(info.GatewayPageURL)
                    }
                    else {
                        return res.status(400).json({
                            message: "SSL session was not successful"
                        })
                    }

                });
            }
            catch (error) {
                console.error(error)
            }
        });
        app.post("/success", async (req, res) => {

            const result = await paymentCollection.updateOne({ tran_id: req.body.tran_id }, {
                $set: {
                    val_id: req.body.val_id
                }
            })

            res.redirect(`http://localhost:5173/success`)

        })
        app.post("/failure", async (req, res) => {
            const result = await paymentCollection.deleteOne({ tran_id: req.body.tran_id })

            res.redirect(`http://localhost:5173/failure`)
        })
        app.post("/cancel", async (req, res) => {
            const result = await paymentCollection.deleteOne({ tran_id: req.body.tran_id })

            res.redirect(`http://localhost:5173`)
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
        app.get("/all-user", async (req, res) => {
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