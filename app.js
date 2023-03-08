const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const l = password.length;
  const hashedPassword = bcrypt.hash(password, 10);
  const query = `select * from user where username='${username}'`;
  const r = await db.get(query);
  if (r === undefined) {
    const addQuery = `
        insert into
        user (name,username,password,gender)
        values(
            '${name}',
            '${username}',
            '${hashedPassword}',
            '${gender}'
        )`;
    await db.run(addQuery);
    response.send("User created successfully");
  } else if (l < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const query = `select user.username,
  tweet.tweet,tweet.date_time as dateTime
   from user inner join
  tweet on user.user_id=tweet.user_id
  where tweet.user_id in (${1},${4})
  order by tweet.date_time DESC
  limit 4
    `;
  const r = await db.all(query);
  response.send(r);
});

app.get("/user/following/", authenticateToken, async (request, response) => {
  const query = `
    select distinct (user.name)
    from user inner join follower on
    user.user_id=follower.following_user_id
    where follower.following_user_id in (${1},${4})`;
  const r = await db.all(query);
  response.send(r);
});

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const query = `
    select user.name
    from user inner join follower
    on user.user_id=follower.follower_user_id
    where follower.following_user_id=${2}`;
  const r = await db.all(query);
  response.send(r);
});

app.get("");

module.exports = app;
