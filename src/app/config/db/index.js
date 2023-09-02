const mongoose = require("mongoose");

/* có await thì phải thêm async trước function */
async function connect() {
  /* async await có cái xử lí lỗi nên ta đưa vào try case */
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/F8_education_dev");
    console.log("Connect successfully");
  } catch (error) {
    console.log("Connect fail");
    /* nếu mà không thấy log ra cái gì thì khả năng cao sẽ là fail, chẳng qua là chưa tới timeout, phải chờ tầm 30s để nó kết nối lại, hết 30s thì nó mới bắn ra */
  }
}

module.exports = { connect };