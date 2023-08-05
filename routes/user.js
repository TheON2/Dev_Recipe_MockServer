const bcrypt = require('bcrypt')
const {isNotLoggedIn, isLoggedIn} = require("./middlewares");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const auth = require("../jwt/auth");
const refreshauth = require("../jwt/refreshauth");
const dotenv = require("dotenv");

dotenv.config();

module.exports = function(app, User)
{
  app.get('/user/kakao', passport.authenticate('kakao', { authType: 'reprompt' }));

  app.get('/user/kakao/callback', function(req, res, next) {
    passport.authenticate('kakao', async function(err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.redirect(`${process.env.ORIGIN}/Login`);
      }
      try {
        console.log('시퀄라이즈 유저 조회함 카카오:',user);
        let sequelizeUser = await User.findOne({ where: { email: user._json.kakao_account.email } });
        if (!sequelizeUser) {
          sequelizeUser = await User.create({
            email: user._json.kakao_account.email,
            nickname: user._json.properties.nickname,
            password: user._json.kakao_account.email,
            method: 'kakao',
          });
        }
        console.log('시퀄라이즈 유저 생성됨 카카오:', sequelizeUser);
        const refreshPayload = {
          email: sequelizeUser.email,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 1), // Refresh token valid for 1 days
        };
        const refreshToken = jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'None', secure: true });
        return res.redirect(`${process.env.ORIGIN}/`);
      } catch (error) {
        return res.redirect(`${process.env.ORIGIN}/Login`);
      }
    })(req, res, next);
  });

  app.get('/user/naver', passport.authenticate('naver', { authType: 'reprompt' }));

  app.get('/user/naver/callback', function(req, res, next) {
    passport.authenticate('naver', async function(err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.redirect(`${process.env.ORIGIN}/Login`);
      }
      try {
        console.log('시퀄라이즈 유저 조회함 네이버:',user);
        let sequelizeUser = await User.findOne({ where: { email: user.email } });
        if (!sequelizeUser) {
          sequelizeUser = await User.create({
            email: user.email,
            nickname: user.nickname,
            password: user.email,
            method: 'naver',
          });
        }
        console.log('시퀄라이즈 유저 생성됨 네이버:', sequelizeUser);
        const refreshPayload = {
          email: sequelizeUser.email,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 1), // Refresh token valid for 1 days
        };
        const refreshToken = jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'None', secure: true });
        return res.redirect(`${process.env.ORIGIN}/`);
      } catch (error) {
        return res.redirect(`${process.env.ORIGIN}/Login`);
      }
    })(req, res, next);
  });
  // google login 화면
  app.get(
    "/user/google",
    passport.authenticate("google", { scope: ["email", "profile"] })
  );

  app.get('/user/google/callback', function(req, res, next) {
    passport.authenticate('google', async function(err, user, info) {
      if (err) {
        return next(err);
      }
      try {
        console.log('시퀄라이즈 유저 조회함 구글:',user);
        let sequelizeUser = await User.findOne({ where: { email: user.email } });
        if (!sequelizeUser) {
          sequelizeUser = await User.create({
            email: user.email,
            nickname: user.displayName,
            password: user.email,
            method: 'google',
          });
        }
        const refreshPayload = {
          email: sequelizeUser.email,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 1), // Refresh token valid for 1 days
        };
        const refreshToken = jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'None', secure: true });
        return res.redirect(`${process.env.ORIGIN}/`);
      } catch (error) {
        return res.redirect(`${process.env.ORIGIN}/Login`);
      }
    })(req, res, next);
  });

  app.get('/api/user/token', auth, async (req, res) => {
    try {
      const user = await User.findOne({ where: { email: req.user.email }});
      console.log('액세스토큰',req.user.email);
      if (!user) res.status(404).send("No user found");
      const userResponse = user.get({ plain: true });
      delete userResponse.password;
      console.log(userResponse);
      return res.status(200).json({email: userResponse.email, nickname: userResponse.nickname});
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.get('/refreshToken', refreshauth, async (req, res) => {
    try {
      console.log('리프레시토큰', req.user.email);
      const payload = {
        email: req.user.email,
        exp: Math.floor(Date.now() / 1000) + (60 * 30),
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      return res.status(200).json({token});
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.get('/api/user/:email', auth, async (req, res) => {
    try {
      const user = await User.findOne({ where: { email: req.params.email }, attributes: { exclude: ['password'] } });
      if (!user) res.status(404).send("No user found");
      res.send(user);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.get('/api/auth/users', async (req, res) => {
    try {
      const user = await User.findAll();
      res.send(user);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  app.post('/api/auth/signup', async (req, res, next) => {
    try {
      const exUser = await User.findOne({ where: { email: req.body.email } });
      if (exUser) {
        return res.status(403).send("이미 사용중인 아이디입니다");
      }
      const hashedPassword = await bcrypt.hash(req.body.password, 12);
      const user = await User.create({
        email: req.body.email,
        nickname: req.body.nickname,
        password: hashedPassword,
        method:'direct',
      });
      const userResponse = user.get({ plain: true });
      delete userResponse.password;
      res.json(userResponse);
    } catch(error){
      console.error(error);
      next(error)
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => {
      if (err) {
        console.log(err);
        return next(err);
      }
      if (info) {
        return res.status(401).send(info.message); // Modified from 'info.reason'
      }
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.log(err);
          return next(loginErr);
        }
        const payload = {
          email: user.email,
          exp: Math.floor(Date.now() / 1000) + (60 * 30), // 토큰 유효기간 30분
        };
        const refreshPayload = {
          email: user.email,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 1), // Refresh token valid for 1 days
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        const refreshToken = jwt.sign(refreshPayload, process.env.JWT_REFRESH_SECRET);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'None', secure: true });
        const userResponse = user.get({ plain: true });
        delete userResponse.password;
        return res.status(200).json({ userResponse, token });
      });
    })(req, res, next);
  });

  app.post("/api/user/logout", (req, res, next) => {
    req.logout(() => {
      req.session.destroy();
      res.cookie('refreshToken', '', { expires: new Date(0), httpOnly: true, sameSite: 'None', secure: true });
      res.send("ok");
    });
  });

  app.patch('/api/user/:email/nickName', auth, async (req, res) => {
    try {
      let user = await User.findOne({ where: { email: req.params.email } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.nickname = req.body.nickname; // Assuming that the field name is 'nickname' not 'nickName'
      await user.save();
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete('/api/user/:email', auth, async (req, res) => {
    try {
      let user = await User.destroy({ where: { email: req.params.email } });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User successfully deleted" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
}
