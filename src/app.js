
//create enviroment variable
require('dotenv').config()
console.log(process.env.API_KEY)

const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const { engine } = require("express-handlebars");
const path = require("path");

const User = require("./app/userScheme/user"); //import

const db = require("./app/config/db");

//bcrypt library to hash password
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';

app.use(express.static(path.join(path.join(__dirname, "public"))));
app.use(bodyParser.urlencoded({ extended: true }));

// Template engine
app.engine(
  ".hbs",
  engine({
    extname: ".hbs",
  })
); //đổi tên đuôi file .handlebars thành .hbs thì những cái nào có chữ handlebars phải đổi thành .hbs hết và thêm cái extname
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "resources", "views"));

app.get("/", function(req, res) {
  res.render("home");
})

app.get("/login", function(req, res) {
  res.render("login");
})

app.get("/register", function(req, res) {
  res.render("register");
})

app.post("/register", async function(req, res) {
  // tạo ra 1 đối tượng newUser
  const newUser = new User({
    email: req.body.username, //lấy value của attribute name trong input tag của form register
    password: await bcrypt.hash(req.body.password, 10),  //giá trị của password được tạo ra bằng cách sử dụng hàm bcrypt.hash để tạo chuỗi hash từ mật khẩu mà người dùng đã nhập. Tham số thứ hai của bcrypt.hash là số vòng lặp để tăng độ an toàn của việc tạo chuỗi hash.
  })

  try {
    await newUser.save(); //sau khi user đã tạo thành công thì sẽ save vào mongoDb
    //này bị lỗi trong hàm không đc khai báo async nên muốn xài phải khai báo async trước hàm callback của app.post, với lại save giờ phiên bản mới nên không sử dụng callback function đc
    res.render("secrets");
  } catch (err) {
    console.log(err);
  }
});

//connect to db
db.connect();

app.post('/login', async (req, res) => {
  const userName = req.body.username; //lấy value của attribute name trong input tag, nên cũng được hiểu nó là email
  const password = req.body.password;

  try {
    const foundUser = await User.findOne({ email: userName });  //tím kiếm ở trên User, ở đây là model User mà mình đã tạo ở trong file user.js xem có email trùng với userName không, phép so sánh

    if (foundUser && await foundUser.comparePassword(password)) {
      //mã kiểm tra xem nếu người dùng tồn tại và mật khẩu nhập vào trùng khớp với mật khẩu đã lưu trong cơ sở dữ liệu (được so sánh thông qua hàm comparePassword), thì người dùng được cho phép truy cập vào trang "secrets".
      res.render('secrets');
    } else {
      console.log('Invalid credentials');
      res.redirect("/login"); // Redirect back to login page if login fails
    }
  } catch (err) {
    console.log(err);
  }
});


app.listen(3000, function (req, res) {
  console.log("Server is running");
});