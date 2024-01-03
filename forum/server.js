const express = require('express')
const app = express()
const { ObjectId, MongoClient } = require('mongodb')
const methodOverride = require('method-override');

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')

const { createServer } = require('http')
const { Server } = require('socket.io')
const server = createServer(app)
const io = new Server(server)


require('dotenv').config();
const db_key = process.env.MONGODB_PW;

// settings
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 },
  store: MongoStore.create({
    mongoUrl: `mongodb+srv://nyah309:${db_key}@cluster0.emzshpb.mongodb.net/?retryWrites=true&w=majority`,
    dbName: 'forum',
  })
}))
app.use(passport.session())

// passport library setting
passport.use(new LocalStrategy(async (inputId, inputPw, cb) => {
  let result = await db.collection('user').findOne({ username: inputId })
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }
  if (bcrypt.compare(inputPw, result.password)) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))

passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username })
  })
})

passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({ _id: new ObjectId(user.id) })
  delete result.password
  process.nextTick(() => {
    return done(null, result)
  })
})

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
  let result = await db.collection('post').find().limit(5).toArray(); res.render('list.ejs', { post: result });
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
    console.log('삭제 완료')
    res.send('삭제 완료');
  } catch(err) {
    console.log(err);
  }

})

// app.get('/list/:page', async (req, res) => {
//   let pageNum = req.params.page;
//   let result = await db.collection('post').find().skip((pageNum - 1) * 5).limit(5).toArray();
//   res.render('list.ejs', { post: result });
// })

app.get('/list/next/:page', async (req, res) => {
  let result = await db.collection('post').find({ _id: { $gt: new ObjectId(req.params.page) } }).limit(5).toArray();
  res.render('list.ejs', { post: result });
})

// 로그인
function isBlank(req, res, next) {
  let id = req.body.username;
  let pw = req.body.password;
  if ((id == '') || (pw == '')) {
    res.send('그러지마세요');
  } else {
    next();
  }
}

app.get('/login', (req, res) => {
  res.render('login.ejs')
})

app.post('/login', async (req, res, next) => {
  // 제출한아이디/비번이 DB에 있는거랑 일치하는지 확인하고 세션생성
  passport.authenticate('local', (error, user, info) => {
    if (error) return res.status(500).json(error)
    if (!user) return res.status(401).json(info.message)
    req.logIn(user, (err) => {
      if (err) return next(err)
      res.redirect('/')
    })
  })(req, res, next)

})

// 회원가입
app.get('/register', (req, res) => {
  res.render('register.ejs')
})

app.post('/register', async (req, res) => {
  let hash = await bcrypt.hash(req.body.password, 10)
  await db.collection('user').insertOne({
    username: req.body.username,
    password: hash
  })
  res.redirect('/')
})


app.get('/search', async (req, res) => {
  let reqData = req.query.val;
  let result = await db.collection('post').find({ title: { $regex: reqData } }).toArray();
  res.render('search.ejs', { post: result });
})


// 채팅기능
// 1. 글마다 채팅버튼 누르면 채팅방 생성
// 2. 내가 속한 채팅방 목록 페이지 있음
// 3. 채팅방 누르면 채팅방 상세페이지 보여줌
// 4. 메세지 전송시 상대에게 전달/DB에 저장

app.get('/chat/request', async (req, res) => {
  await db.collection('chatroom').insertOne({
    member: [req.user._id, new ObjectId(req.query.writerId)],
    date: new Date()
  })
  res.redirect('채팅방목록페이지')
})

app.get('/chat/list', async (req, res) => {
  let result = await db.collection('chatroom').find({ member: req.user._id }).toArray()
  res.render('chatList.ejs', { 글목록: result })
})

app.get('/chat/detail', async (req, res) => {
  res.render('chatDetail.ejs')
})

io.on('connection', (socket) => {
  console.log('어떤놈이 웹소켓 연결함');
  socket.on('age', (data) => {
    console.log('유저가 보낸거 ', data);
    io.emit('name', 'kim');
  })

  socket.on('ask-join', (data) => {
    socket.join(data);
  })

  socket.on('message', (data) => {
    io.to(data.room).emit('broadcast', data.msg);
  })
})

app.get('/stream/list', (req, res) => {
  res.writeHead(200, {
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  })

  
  
  
  changeStream.on('change', (result) => {
    console.log(result);
    res.write('event: msg\n');
    res.write(`data: ${JSON.stringify(result.fullDocument)}\n\n`);
  })

})