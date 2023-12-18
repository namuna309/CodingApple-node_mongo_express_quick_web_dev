const express = require('express')
const app = express()

app.use(express.static(__dirname + '/public'));

app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
})

app.get('/', (req, res) => {
    // res.send('반갑다');
    res.sendFile(__dirname + '/index.html');
})



app.get('/shop', (req, res) => {
    res.send('쇼핑페이지임');
})

// 웹페이지에 디자인 넣으려면: 숙제
app.get('/about', (req, res) => {
    res.sendFile(__dirname + '/about.html');
})

const { MongoClient } = require('mongodb')

let db
const url = 'mongodb+srv://nyah309:password@cluster0.emzshpb.mongodb.net/?retryWrites=true&w=majority'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})

app.get('/news', (req, res) => {
    db.collection('post').insertOne({title: '어쩌구'});
    res.send('오늘 비옴');
  }) 

app.get('/list', async (req, res) => {
    let result = await db.collection('post').find().toArray();
    console.log(result[0]);
    res.send('DB에 있던 게시물');
  }) 