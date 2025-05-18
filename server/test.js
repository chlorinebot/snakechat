// Tạo script để kiểm tra dữ liệu last_activity
const userService = require('./services/userService');

async function test() {
  try {
    const users = await userService.getAllUsers();
    console.log('Sample user with last_activity:');
    console.log(JSON.stringify(users[0], null, 2));
  } catch (err) {
    console.error(err);
  }
}

test(); 