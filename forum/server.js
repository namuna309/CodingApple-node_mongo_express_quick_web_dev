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


// AWS S3 access
const s3 = new S3Client({
  region: 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '.png') //업로드시 파일명 변경가능
    }
  })
})

let connectDB = require('./routes/database')
let db
let changeStream;
connectDB.then((client) => {
  let cond = [
    { $match : {operationType: 'insert'}}
  ]

  
  console.log('DB연결성공')
  db = client.db('forum')
  server.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
    changeStream = db.collection('post').watch(cond);
  });
  
}).catch((err) => {
  console.log(err)
})

app.use('/shop', require('./routes/shop.js'));

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



app.get('/news', (req, res) => {
  db.collection('post').insertOne({ title: '어쩌구' });
  res.send('오늘 비옴');
})

function logTime(res, req, next) {
  let curTime = new Date().toString();
  console.log(curTime);
  next();
}

app.use('/list', logTime);

app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().limit(5).toArray();  res.render('list.ejs', { post: result });
})

app.get('/time', (req, res) => {
  res.render('time.ejs', { time: new Date() });
})

app.get('/write', (req, res) => {
  res.render('write.ejs');
})

app.post('/add', upload.single('img1'), async (req, res) => {
  let data = req.body;

  if (data.title == '') {
    res.send('제목?');
  } else if (data.content == '') {
    res.send('내용?');
  } else {
    try {
      await db.collection('post').insertOne({ title: data.title, content: data.content, img: req.file.location });
      await db.collection('post').find().toArray();
      console.log('입력 성공');
      res.redirect('/list');
    } catch (e) {
      console.log('db 입력 실패');
      res.status(500).send(e);
    }

  }
})

app.get('/detail/:id', async (req, res) => {
  try {
    let objId = req.params;
    let result = await db.collection('post').findOne({ _id: new ObjectId(objId) })
    console.log(result);
    if (result == null) {
      응답.status(400).send('그런 글 없음')
    } else {
      res.render('detail.ejs', { post: result });
    }
  } catch (e) {
    console.log(e);
    res.status(400).send('이상한 url 입력함');
  }
})

app.get('/edit/:id', async (req, res) => {
  let objId = req.params;
  let result = await db.collection('post').findOne({ _id: new ObjectId(objId) });
  res.render('edit.ejs', { post: result });

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
app.put('/edit', async (req, res) => {
  let data = req.body;
  try {
    await db.collection('post').updateOne({ _id: new ObjectId(data.id) }, { $set: { title: data.title, content: data.content } });
    console.log('수정 성공');
    res.redirect(`/detail/${data.id}`);
  } catch (err) {
    console.log('수정 실패');
    res.status(400).send(err);
  }
})

app.post('/abc', async (req, res) => {
  console.log(req.body);
})

app.delete('/delete', async (req, res) => {
  let post = req.query.id;
  console.log(post);
  try{
    await db.collection('post').deleteOne({_id: new ObjectId(post)});
    res.redirect('/list');
  } catch(err) {
    console.log(err);
  }

})


