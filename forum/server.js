const express = require('express')
const app = express()
const { ObjectId, MongoClient } = require('mongodb') 
const methodOverride = require('method-override');

require('dotenv').config();
db_key = process.env.MONGODB_PW;

// settings
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({extended:true})) 


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

let db
const url = `mongodb+srv://nyah309:${db_key}@cluster0.emzshpb.mongodb.net/?retryWrites=true&w=majority`
new MongoClient(url).connect().then((client) => {
  console.log('DB연결성공')
  db = client.db('forum')
}).catch((err) => {
  console.log(err)
})

app.get('/news', (req, res) => {
  db.collection('post').insertOne({ title: '어쩌구' });
  res.send('오늘 비옴');
})

app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray();
  res.render('list.ejs', { post: result });
})

app.get('/time', (req, res) => {
  res.render('time.ejs', {time: new Date()});
})

app.get('/write', (req, res) => {
  res.render('write.ejs');
})

app.post('/add', async (req, res)=>{
  let data = req.body;

  if (data.title == '') {
    res.send('제목?');
  } else if (data.content == '') {
    res.send('내용?');
  } else {
    try {
      await db.collection('post').insertOne({ title: data.title, content: data.content});
      await db.collection('post').find().toArray();
      console.log('입력 성공');
      res.redirect('/list');
    } catch(e) {
      console.log('db 입력 실패');
      res.status(500).send(e);
    }
   
  }
}) 

app.get('/detail/:id', async (req, res) => {
  try {
    let objId = req.params;
    let result = await db.collection('post').findOne({_id: new ObjectId(objId)})
    if (result == null) {
      응답.status(400).send('그런 글 없음')
    } else {
      res.render('detail.ejs', {post: result});
    }
  } catch(e) {
    console.log(e);
    res.status(400).send('이상한 url 입력함');
  }
})

app.get('/edit/:id', async (req, res) => {
  let objId = req.params;
  let result = await db.collection('post').findOne({_id: new ObjectId(objId)});
  res.render('edit.ejs', {post: result});

})

// app.post('/modify/:id', async (req, res) => {
//   let objId = req.params;
//   let data = req.body;
//   try {
//     await db.collection('post').updateOne({_id: new ObjectId(objId)}, {$set: { title : data.title, content: data.content }});
//     console.log('수정 성공');
//     res.redirect(`/detail/${objId.id}`);
//   } catch (err) {
//     console.log('수정 실패');
//     res.status(400).send(err);
//   }
// })
app.put('/edit', async (req, res)=>{
  let data = req.body;
  try {
    await db.collection('post').updateOne({_id: new ObjectId(data.id)}, {$set: { title : data.title, content: data.content }});
    console.log('수정 성공');
    res.redirect(`/detail/${data.id}`);
  } catch (err) {
    console.log('수정 실패');
    res.status(400).send(err);
  }
})