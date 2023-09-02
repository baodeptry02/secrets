//create enviroment variable
require('dotenv').config()

const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const { engine } = require("express-handlebars");
const path = require("path");

const User = require("./app/userScheme/user"); //import

const db = require("./app/config/db");

// 3 cái này đi chung để authenticate
const session = require('express-session')
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

// app.use
app.use(express.static(path.join(path.join(__dirname, "public"))));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({ //section package npm
  secret: 'Our little secrret.',
  resave: false,
  saveUninitialized: false, // nên set là false, vì nó sẽ ngăn chặn việc tạo section mới ngay cả khi section
  // chưa được khởi tạo (uninitialized), tránh tạo ra nhiều section trống khi có nhiều yêu cầu không cần thiết, 
  //cũng là mục đích tăng hiệu suất vào bảo mật 
}))

app.use(passport.initialize());
app.use(passport.session());

// Template engine
app.engine(
  ".hbs",
  engine({
    extname: ".hbs",
  })
); //đổi tên đuôi file .handlebars thành .hbs thì những cái nào có chữ handlebars phải đổi thành .hbs hết và thêm cái extname
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "resources", "views"));

// cần để 3 dòng này dưới module User
// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// khi Serialize thì tạo ra 1 fortune cookie chứa thông tin nhận dạng ng dùng (user identity information), thì ở đây cho cụ thể là ID, sau đó fortune ID này được gán vào session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// khi deserializeUser thì mình sẽ đọc fortune cookie đó từ section hoặc token bằng cách giải mã, sau đó mình sẽ biết user đó là ai
passport.deserializeUser(function(id, done) {
  User.findById(id)
    .then(user => {
      done(null, user);
    })
    .catch(err => {
      done(err, null);
    });
});


app.get("/", function(req, res) {
  res.render("home");
})

app.get("/login", function(req, res) {
  res.render("login");
})

app.get("/register", function(req, res) {
  res.render("register");
})

app.get("/secrets", function(req, res){
  // check xem nếu user đã login rồi thì render trang này luôn, còn chưa thì redirect lại trang login, đối với trường hợp vừa mới truy cập đã muốn vào trang secrects luôn
  if(req.isAuthenticated()){
    res.render("secrets")
  } else {
    res.redirect("/login")
  }
}) 

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
       return next(err); 
      }
    res.redirect('/');
  });
})

app.post("/register", async function(req, res) {
  console.log(req.body.username)
  // tạo ra 1 đối tượng newUser
  const newUser = new User({
    name: req.body.firstName,
    lastName: req.body.lastName,
    address: req.body.address,
    username: req.body.username,
    active: false
  })

  User.register(newUser, req.body.password, async function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      // authenticate ở trong local
      passport.authenticate('local')(req, res, function() {
        // callback function thiết lập để lưu phiên đăng nhập hiện tại của user
        //res.redirect("/secrets");
        res.redirect("/secrets");
      });
    }
  })
  });

//connect to db
db.connect();

app.post('/login',  function(req, res)  {
  const user = new User( {

     username : req.body.username, //lấy value của attribute name trong input tag, nên cũng được hiểu nó là email
     password : req.body.password
  })

  req.login(user, function(err) {
    passport.authenticate('local')(req, res, function() {
      res.redirect("/secrets")
      })
  })
});


app.listen(3000, function (req, res) {
  console.log("Server is running");
});