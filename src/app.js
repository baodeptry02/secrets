//create enviroment variable
require('dotenv').config()

const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const exphbs  = require("express-handlebars");
const Handlebars = require('handlebars')
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const path = require("path");

const User = require("./app/userScheme/user"); //import

const db = require("./app/config/db");

// 3 cái này đi chung để authenticate
const session = require('express-session')
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

const GoogleStrategy = require('passport-google-oauth20').Strategy;

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
// npm install @handlebars/allow-prototype-access, const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access'),
// rồi add cái const hbs như dưới, do xung đột phiên bản
const hbs = exphbs.create({
  defaultLayout: 'main', 
  extname: '.hbs',
  handlebars: allowInsecurePrototypeAccess(Handlebars)
}); //đổi tên đuôi file .handlebars thành .hbs thì những cái nào có chữ handlebars phải đổi thành .hbs hết và thêm cái extname
app.engine('hbs', hbs.engine); 
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
passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id).exec();
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {

  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


app.get("/", function(req, res) {
  res.render("home");
})

app.get("/login", function(req, res) {
  res.render("login");
})

app.get("/register", function(req, res) {
  res.render("register");
})

app.get("/submit", function(req, res) {
  // check xem nếu user đã login rồi thì render trang này luôn, còn chưa thì redirect lại trang login, đối với trường hợp vừa mới truy cập đã muốn vào trang submits luôn
  if(req.isAuthenticated()){
    res.render("submit")
  } else {
    res.redirect("/login")
  }
})

app.post("/submit", async function(req, res) {
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  try {
    const foundUser = await User.findById(req.user.id).exec();
    
    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save();
      res.redirect("/secrets");
    }
  } catch (err) {
    console.log(err);
    // Xử lý lỗi tại đây nếu cần thiết.
  }
});


app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
// failureRedirect là nếu có lỗi gì nó sẽ đưa lại về route login, còn thành công thì vào trang secrets
passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  });

app.get("/secrets", async (req, res) => {
  try {
    // Use await with the Mongoose query to find users with a non-null secret field
     // ne = non equal, We're trying to find all the users which have a filled secret field. And we're going to pass in these
    const foundUsers = await User.find({ "secret": { $ne: null } });
    const usersWithSecrets = foundUsers;

    // Render the "secrets" template with the found users
    res.render("secrets", { usersWithSecrets,
      allowInsecurePrototypeAccess: true, });
  } catch (err) {
    // Handle any errors
    console.error(err);
    res.status(500).send("Internal Server Error"); // You can customize the error handling as needed
  }
});

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
       return next(err); 
      }
    res.redirect('/');
  });
})

// mở mongosh vô, truy cập vào userDB bằng lệnh use userDB, rồi sau đó sử dụng lệnh db.users.dropIndex("email_1"); để xóa thành email_1 đi, để không còn lỗi E1001 email duplicate
app.post("/register", async function(req, res) {
  console.log(req.body.username);

  // Tạo ra một đối tượng newUser
  const newUser = new User({
    name: req.body.firstName,
    lastName: req.body.lastName,
    address: req.body.address,
    username: req.body.username,
    active: false
  });

  // Đăng ký người dùng mới
  await User.register(newUser, req.body.password);

  // Authenticate người dùng
  passport.authenticate('local')(req, res, function() {
    // callback function thiết lập để lưu phiên đăng nhập hiện tại của user
    res.redirect("/secrets");
  });
});

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

//connect to db
db.connect();

app.listen(3000, function (req, res) {
  console.log("Server is running");
});