const express = require('express')
const app = express()
const { ObjectId, MongoClient } = require('mongodb') 
const methodOverride = require('method-override');

require('dotenv').config();

// 로그인 기능 구현을 위한 셋팅
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

app.use(passport.initialize())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave : false,
  saveUninitialized : false,
  // 유효기간 설정
  cookie: {maxAge: 60 * 60 * 1000 } // 1시간
}))

app.use(passport.session()) 
// 여기까지


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

app.post('/abc', async (req, res) => {
  console.log(req.body);
})

app.delete('/delete', async(req, res) => {
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

// session 방식
// 1. 가입 기능
// 2 로그인 기능
// 3. 로그인 완료시 세션 만들기
// 4. 로그인 완료시 유저에게 입장권 보내줌
// 5. 로그인여부 확인하고 싶으면 입장권 까봄
// passport 라이브러리 쓰면 쉽게 구현 가능

// passport를 활용하여 user가 제출한 id, 비번이 db와 일치하는지 검사하는 로직
// passport.authenticate('local')() 쓰면 이 로직이 실행됨
passport.use(new LocalStrategy(async (input_username, input_password, cb) => {
  
  let result = await db.collection('user').findOne({ username : input_username})
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }
  if (result.password == input_password) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))

// session 생성
passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username });
  })
})

passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({ _id: new ObjectId(user.id)})
  delete result.password;
  process.nextTick(() => {
    return done(null, result)
  })
})


app.get('/login', async (req, res) => {
  console.log(req.user);
  res.render('login.ejs');
})

app.post('/login', async (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) res.status(500).json(error);
    if(!user) res.status(401).json(info.message);
    req.logIn(user, (err) => {
      if(err) return next(err);
      res.redirect('/list');
    })
  }) (req, res, next)
})

app.get('/mypage', async (req, res) => {
  let user_data = req.user;
  if(user_data) res.render('mypage.ejs', {user: req.user});
  else res.redirect('/list');
})